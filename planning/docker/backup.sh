#!/bin/sh
# Dump quotidien de la base planning, rotation sur BACKUP_KEEP_DAYS jours
set -eu

while true; do
  now_hour=$(date -u +%H | sed 's/^0//')
  if [ "${now_hour:-0}" = "${BACKUP_HOUR}" ]; then
    file="/backups/planning-$(date -u +%Y%m%d-%H%M).sql.gz"
    if mariadb-dump -h mariadb -u root --single-transaction --routines --triggers planning | gzip > "$file.tmp"; then
      mv "$file.tmp" "$file"
      echo "sauvegarde OK : $file"
    else
      rm -f "$file.tmp"
      echo "sauvegarde EN ÉCHEC" >&2
    fi
    find /backups -name 'planning-*.sql.gz' -mtime +"${BACKUP_KEEP_DAYS}" -delete
    sleep 3600
  fi
  sleep 300
done
