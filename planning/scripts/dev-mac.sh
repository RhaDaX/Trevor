#!/usr/bin/env bash
#
# Lance tout l'outil planning en local sur un Mac, en une commande :
#   ./scripts/dev-mac.sh
#
# Installe si besoin (Homebrew) Node 22, MariaDB, Redis et Mailpit, crée les
# bases, prépare le .env, migre, charge les données de démo, puis démarre
# l'app et le worker. Ctrl+C arrête tout. Relançable sans risque.
#
set -euo pipefail

cd "$(dirname "$0")/.."
APP_URL="${APP_URL:-http://localhost:3333}"
step() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

# --- 1. Outils ---------------------------------------------------------------
if [[ "${SKIP_BREW:-0}" != "1" ]]; then
  step "Outils (Homebrew)"
  command -v brew >/dev/null || { echo "Homebrew manquant : https://brew.sh"; exit 1; }
  for pkg in node@22 mariadb redis mailpit; do
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
  APP_URL="$APP_URL" VAPID="$vapid" node --input-type=module -e '
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
node ace planning:worker > storage/worker.log 2>&1 &
worker=$!
trap 'kill $worker 2>/dev/null; echo; echo "Arrêté."' EXIT INT TERM

cat <<INFO

  App       $APP_URL          (nathan@example.com / secret123)
  Mails     http://localhost:8025   (récap : node ace recap:send nathan@example.com)
  Worker    rappels, relances, récap — journal dans storage/worker.log

  Ctrl+C pour tout arrêter.

INFO

( sleep 6; command -v open >/dev/null && open "$APP_URL" ) &
node ace serve --hmr
