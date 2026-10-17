# Liaison planning — CRM Next.js

À copier dans le CRM Next.js (App Router + Prisma), en respectant l'arborescence :

| Fichier                             | Rôle                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `lib/planning.ts`                   | Format commun, fonctions `toPlanning*` (**à adapter au schéma**), jeton, webhooks signés           |
| `lib/prisma.ts`                     | Client Prisma étendu : chaque écriture sur clients, contrats, factures, relances envoie un webhook |
| `app/api/planning/clients/route.ts` | `GET /api/planning/clients` pour la synchro de nuit                                                |
| `app/api/planning/dates/route.ts`   | `GET /api/planning/dates` pour la synchro de nuit                                                  |
| `prisma/schema.example.prisma`      | Modèles supposés (champs lus par `toPlanning*`)                                                    |

Variables du CRM : `PLANNING_API_TOKEN`, `PLANNING_WEBHOOK_URL` (`…/webhooks/crm/crm_b`), `PLANNING_WEBHOOK_SECRET`, `APP_URL`.
Côté outil : `CRM_B_API_URL=https://crm-b…/api/planning`, `CRM_B_API_TOKEN` et `CRM_B_WEBHOOK_SECRET` avec les mêmes valeurs.

Les routes n'utilisent que `Request`/`Response` standard : rien de spécifique à une version de Next.
Si `lib/prisma.ts` existe déjà, fusionner : garder son contenu et envelopper le `new PrismaClient()` existant avec le `$extends` fourni.
