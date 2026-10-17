#!/bin/bash

# Raycast Script Command — capture d'une tâche en une ligne depuis le Mac
#
# Installation : Raycast → Extensions → Script Commands → Add Directories,
# puis assigner un raccourci clavier global (ex. ⌥⌘T) à « Ajouter une tâche ».
# Renseigner PLANNING_URL et PLANNING_TOKEN (jeton créé dans Réglages).
#
# @raycast.schemaVersion 1
# @raycast.title Ajouter une tâche
# @raycast.mode silent
# @raycast.packageName Planning
# @raycast.icon ✅
# @raycast.argument1 { "type": "text", "placeholder": "rappeler Dupont jeudi 14h #urgent" }

PLANNING_URL="${PLANNING_URL:-https://planning.example.com}"
PLANNING_TOKEN="${PLANNING_TOKEN:-plt_à_remplacer}"

payload=$(/usr/bin/python3 -c 'import json,sys; print(json.dumps({"text": sys.argv[1]}))' "$1")

response=$(curl -sS -X POST "$PLANNING_URL/api/tasks" \
  -H "Authorization: Bearer $PLANNING_TOKEN" \
  -H "X-Planning-Origin: mac" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data "$payload")

message=$(echo "$response" | /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("message") or d.get("errors", [{}])[0].get("message", "Erreur"))' 2>/dev/null)
echo "${message:-Erreur de connexion}"
