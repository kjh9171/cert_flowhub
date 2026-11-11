#!/bin/sh
# FlowHub DB 백업 스크립트
# 사용: ./scripts/backup.sh [output_dir]
set -e

OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
FILE="$OUT_DIR/flowhub_${STAMP}.sql.gz"

echo "[backup] dumping database to $FILE"
docker compose exec -T flowhub-db pg_dump -U "${POSTGRES_USER:-flowhub}" "${POSTGRES_DB:-flowhub}" | gzip > "$FILE"
echo "[backup] done: $FILE"
