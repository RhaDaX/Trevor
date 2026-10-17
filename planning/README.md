# Planning — outil de tâches relié aux CRM (V1)

Objectif V1 : **ne plus jamais oublier une tâche**, la capturer en moins de 5 secondes et être relancé jusqu'à ce qu'elle soit faite.

Stack : AdonisJS 6 · Inertia · React 19 · Tailwind 4 · Lucid / **MariaDB** · Redis + BullMQ · Docker Compose (Dokploy).

## Ce que fait la V1

| Entrée | Point d'entrée |
| --- | --- |
| Mail client | Boîte dédiée Infomaniak relevée en IMAP chaque minute : sujet = titre, corps et pièces jointes conservés, client reconnu par l'expéditeur (y compris dans un mail transféré) |
| Idée au bureau | Raccourci clavier global sur Mac (Raccourci Apple ou script Raycast `extras/raycast/add-task.sh`) |
| Appel, couloir | Raccourci Siri « Ajoute une tâche » → `POST /api/tasks` avec un jeton personnel |
| Dans l'app | Champ de saisie rapide en haut de chaque page (⌘K) : recherche et création au même endroit, avec aperçu |
| CRM | Dates utiles (échéance, renouvellement, relance) → tâches automatiques, sans doublon, mises à jour si la date bouge |

| Sortie | Détail |
| --- | --- |
| Flux iCal | `/calendar/:token.ics`, abonné dans Calendrier sur Mac et iPhone, alerte native par tâche |
| Push iPhone / Mac | Web Push sur la PWA (iOS ≥ 16.4, app ajoutée à l'écran d'accueil), avec boutons +1 h / Demain / Fait |
| Récap du matin | Mail + push à l'heure choisie : tâches du jour, retards, contenu de « à trier » |

**Saisie naturelle** : `rappeler Dupont jeudi 14h #urgent` → tâche jeudi 14 h (heure de Paris), client Dupont, priorité haute.
Étiquettes : `#urgent` `#important` `!` (haute), `#bas` (basse), `#a` `#b` (entreprise). Récurrence : « tous les mois (le 5) », « chaque semaine », « tous les trimestres », « chaque année ».
Sans date reconnue, ou si le client est ambigu, la tâche va dans **À trier**.

**Jamais silencieuse** : une tâche datée sonne à l'échéance (ou au rappel / report), puis est relancée à intervalle réglable (2 h par défaut, jours ouvrés, 8 h–19 h) jusqu'à être cochée ou reportée. Une tâche sans date est dans « à trier » et revient chaque matin dans le récap.

## Démarrer en local

Prérequis : Node 22 (Adonis 6 ne charge pas ses commandes sous Node 24), MariaDB ≥ 10.6, Redis.

```bash
cd planning
npm install
cp .env.example .env            # puis renseigner DB_*, REDIS_*, APP_KEY
node ace generate:key
node ace vapid:generate         # copier les deux clés dans .env
node ace migration:run
node ace user:create nathan@exemple.fr --name=Nathan
node ace db:seed                # optionnel : données de démo (nathan@example.com / secret123)

npm run dev                     # app sur http://localhost:3333
node ace planning:worker        # dans un autre terminal : IMAP, rappels, récap, synchro CRM
```

Tests : `npm test` (base `planning_test`, voir `.env.test`). Vérifications : `npm run lint`, `npm run typecheck`.

## Déploiement Dokploy

1. Nouveau projet → **Compose**, dépôt Git, chemin `planning/docker-compose.yml`.
2. Onglet Environment : reprendre `.env.example` (au minimum `APP_KEY`, `APP_URL`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `MAIL_FROM`, SMTP, IMAP, VAPID, secrets des CRM).
3. Domaine HTTPS sur le service `app`, port 3333 (HTTPS obligatoire pour le push et la PWA).
4. Après le premier déploiement : `docker compose exec app node ace user:create <email>`.

Conteneurs : `app` (migrations au démarrage), `worker`, `mariadb`, `redis` (AOF, sans éviction), `backup` (dump quotidien gzip, 14 jours, volume `backups`).

## Brancher les CRM

Chaque CRM a un adaptateur (`CrmAdapter` : `fetchClients(since)`, `fetchDates(since)`, `mapClient()`, `mapDate()`). Un troisième CRM = une entrée de plus dans `config/planning.ts` et `config/crm.ts`.

1. **Correspondance des tables** : `config/crm.ts`. Les noms de tables et de colonnes y sont des hypothèses (point ouvert du cahier des charges) — c'est le seul fichier à ajuster.
2. **Webhooks** (côté CRM) : `POST /webhooks/crm/crm_a` (ou `crm_b`) signé HMAC-SHA256 — exemple prêt à coller dans `extras/crm_webhook_example.ts`.
   - En-têtes : `X-Planning-Timestamp: <secondes unix>`, `X-Planning-Signature: sha256=<hex de HMAC(secret, "<timestamp>.<corps>")>` (tolérance 5 min).
   - Corps : `{ "event": "client.upserted" | "client.deleted" | "date.upserted" | "date.deleted", "kind": "renouvellement", "data": { …colonnes de la ligne… } }`, ou `{ "events": [ … ] }` pour un lot.
   - L'événement est mis en file (Redis) et appliqué par le worker.
3. **Filet de sécurité** : synchro delta (`updated_at > dernière synchro`) chaque nuit à 3 h, via un utilisateur SQL **en lecture seule** (`CRM_A_DB_URL=mysql://lecteur:…@hôte:3306/crm_a`, `postgres://` accepté). Manuel : `node ace crm:sync [crm_a] [--full]` (`--full` archive aussi les clients disparus).

Les tâches CRM sont identifiées par `source + external_id` (`crm_a:renouvellement:7`) : un même événement reçu deux fois ne crée rien, une date déplacée met la tâche à jour (et la rouvre si elle avait été cochée), une date supprimée l'annule. Les tâches CRM sont attribuées au premier compte (V1 mono-utilisateur).

## Raccourcis Apple

Créer un jeton dans **Réglages → Jetons d'API** (un par appareil, révocable).

- **Siri (iPhone)** : Raccourcis → « Dicter le texte » → « Obtenir le contenu de l'URL » (`POST https://…/api/tasks`, en-têtes `Authorization: Bearer <jeton>` et `X-Planning-Origin: siri`, corps JSON `text`) → « Obtenir la valeur du dictionnaire » `message` → « Énoncer ». Nommer le raccourci « Ajoute une tâche ».
- **Mac** : même raccourci avec « Demander une entrée », origine `mac`, raccourci clavier global dans ses détails ; ou Raycast avec `extras/raycast/add-task.sh`.

## Écarts assumés par rapport au cahier des charges

- **MariaDB au lieu de Postgres** : pas de `pg_trgm`, le rapprochement client flou se fait en mémoire (index rechargé chaque minute, ~1000 clients) : email exact, puis domaine (hors Gmail, Orange…), puis nom (Levenshtein). Ambigu → sans client et à trier, avec suggestions dans la boîte.
- **Une table de plus** que les quatre prévues : `push_subscriptions` (appareils abonnés au push), en plus de celles d'Adonis (`users`, `auth_access_tokens`).
- **React** retenu pour Inertia (point ouvert tranché).
- Intervalle de relance par défaut : **2 h** (réglable, point ouvert).

## Arborescence

```
app/services/task_parser.ts       saisie en langage naturel (chrono-node, français)
app/services/client_matcher.ts    rapprochement client (email, domaine, nom)
app/services/task_service.ts      capture, report, récurrence, tri
app/services/reminders.ts         sonnerie, relance insistante, récap du matin
app/services/calendar_service.ts  flux iCal
app/services/mail_capture.ts      relève IMAP Infomaniak
app/services/crm/                 adaptateurs, signature HMAC, synchro
commands/worker.ts                worker BullMQ + tâches planifiées
public/sw.js                      service worker (push, actions rapides)
```
