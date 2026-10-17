#!/usr/bin/env bash
#
# Lance tout l'outil planning en local sur un Mac, en une commande :
#   ./scripts/dev-mac.sh            → http://localhost:3333
#   ./scripts/dev-mac.sh --tunnel   → en plus, une URL HTTPS publique (Cloudflare)
#                                     et un QR code pour l'ouvrir sur l'iPhone
#
# Installe si besoin (Homebrew) Node 22, MariaDB, Redis et Mailpit, crée les
# bases, prépare le .env, migre, charge les données de démo, puis démarre
# l'app et le worker. Ctrl+C arrête tout. Relançable sans risque.
#
set -euo pipefail

cd "$(dirname "$0")/.."
TUNNEL=0
[[ "${1:-}" == "--tunnel" ]] && TUNNEL=1
APP_URL="${APP_URL:-http://localhost:3333}"
step() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

# --- 1. Outils ---------------------------------------------------------------
if [[ "${SKIP_BREW:-0}" != "1" ]]; then
  step "Outils (Homebrew)"
  command -v brew >/dev/null || { echo "Homebrew manquant : https://brew.sh"; exit 1; }
  pkgs=(node@22 mariadb redis mailpit)
  [[ "$TUNNEL" == "1" ]] && pkgs+=(cloudflared qrencode)
  for pkg in "${pkgs[@]}"; do
    brew list --versions "$pkg" >/dev/null 2>&1 || brew install "$pkg"
  done
  for svc in mariadb redis mailpit; do brew services start "$svc" >/dev/null; done
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi

# Adonis 6 ne charge pas ses commandes sous Node 24
node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$node_major" != "22" ]]; then
  echo "Node 22 requis (trouvé $(node -v))."; exit 1
fi

# --- 2. Bases ----------------------------------------------------------------
step "Bases de données"
sql="CREATE DATABASE IF NOT EXISTS planning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS planning_test CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'planning'@'localhost' IDENTIFIED BY 'planning';
GRANT ALL ON planning.* TO 'planning'@'localhost';
GRANT ALL ON planning_test.* TO 'planning'@'localhost';
FLUSH PRIVILEGES;"
for i in {1..20}; do mariadb-admin ping >/dev/null 2>&1 && break; sleep 1; done
# Homebrew crée un compte MariaDB au nom de l'utilisateur macOS ; sinon root via sudo
mariadb -e "$sql" 2>/dev/null || mariadb -u root -e "$sql" 2>/dev/null || sudo mariadb -e "$sql"
for i in {1..20}; do redis-cli ping >/dev/null 2>&1 && break; sleep 1; done

# --- 3. Dépendances et .env ----------------------------------------------------
step "Dépendances"
[[ -d node_modules ]] || npm install

if [[ ! -f .env ]]; then
  step "Création du .env"
  cp .env.example .env
  node ace generate:key >/dev/null
  vapid="$(node ace vapid:generate)"
  APP_URL="http://localhost:3333" VAPID="$vapid" node --input-type=module -e '
    import { readFileSync, writeFileSync } from "node:fs"
    const set = { NODE_ENV: "development", HOST: "localhost", APP_URL: process.env.APP_URL,
      DB_HOST: "127.0.0.1", DB_USER: "planning", DB_PASSWORD: "planning", DB_DATABASE: "planning",
      SMTP_HOST: "localhost", SMTP_PORT: "1025", SMTP_USERNAME: "", SMTP_PASSWORD: "",
      MAIL_FROM: "planning@localhost", IMAP_HOST: "" }
    for (const line of process.env.VAPID.split("\n")) {
      const m = line.match(/^(VAPID_(?:PUBLIC|PRIVATE)_KEY)=(.+)$/)
      if (m) set[m[1]] = m[2]
    }
    let env = readFileSync(".env", "utf8")
    for (const [k, v] of Object.entries(set)) env = env.replace(new RegExp(`^${k}=.*$`, "m"), `${k}=${v}`)
    writeFileSync(".env", env)
  '
fi

# --- 4. Base applicative -------------------------------------------------------
step "Migrations et données de démo"
node ace migration:run --force
users="$(mariadb -N -u planning -pplanning -h 127.0.0.1 planning -e 'SELECT COUNT(*) FROM users')"
[[ "$users" == "0" ]] && node ace db:seed

# --- 5. Démarrage --------------------------------------------------------------
step "Démarrage"
mkdir -p storage
pids=()
cleanup() {
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  echo; echo "Arrêté."
}
trap cleanup EXIT INT TERM

if [[ "$TUNNEL" == "1" ]]; then
  step "Tunnel Cloudflare"
  cloudflared tunnel --no-autoupdate --url http://localhost:3333 > storage/tunnel.log 2>&1 &
  pids+=($!)
  url=""
  for i in {1..30}; do
    url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' storage/tunnel.log | grep -v '//api\.' | head -1 || true)"
    [[ -n "$url" ]] && break
    sleep 1
  done
  [[ -z "$url" ]] && { echo "Tunnel indisponible (voir storage/tunnel.log)"; exit 1; }
  # L'URL publique sert aux liens des notifications, du calendrier et des mails
  export APP_URL="$url"

  # Version de production (sans serveur Vite) : ce que l'iPhone verra une fois déployé
  step "Build de production"
  NODE_ENV=production node ace build > storage/build.log 2>&1 || { cat storage/build.log; exit 1; }
  cp .env build/.env
  ln -sfn ../node_modules build/node_modules
  export NODE_ENV=production
  cd build
fi

mkdir -p storage
node ace planning:worker > storage/worker.log 2>&1 &
pids+=($!)

cat <<INFO

  App       http://localhost:3333   (nathan@example.com / secret123)
  Mails     http://localhost:8025   (récap : node ace recap:send nathan@example.com)
  Worker    rappels, relances, récap — journal dans storage/worker.log
INFO

if [[ "$TUNNEL" == "1" ]]; then
  cat <<INFO
  Public    $APP_URL

  En mode tunnel, utiliser l'adresse publique (aussi sur le Mac).
  Sur l'iPhone : scanner le QR code, puis Partager → « Sur l'écran d'accueil »,
  ouvrir l'app depuis l'icône et activer les notifications dans Réglages.
  L'adresse change à chaque lancement du tunnel.

INFO
  qrencode -t ansiutf8 "$APP_URL"
fi

echo "  Ctrl+C pour tout arrêter."
echo
( sleep 6; command -v open >/dev/null && open "$APP_URL" ) &
if [[ "$TUNNEL" == "1" ]]; then
  node bin/server.js
else
  node ace serve --hmr
fi
