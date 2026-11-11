#!/bin/sh
# FlowHub DB 복원 스크립트
# 사용: ./scripts/restore.sh <backup_file.sql.gz>
set -e

FILE="$1"
if [ -z "$FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

echo "[restore] restoring from $FILE"
gunzip -c "$FILE" | docker compose exec -T flowhub-db psql -U "${POSTGRES_USER:-flowhub}" "${POSTGRES_DB:-flowhub}"
echo "[restore] done"
