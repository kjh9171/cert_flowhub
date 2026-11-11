#!/bin/sh
set -e
# 업로드 디렉토리 권한 보정
mkdir -p /app/uploads
chown -R nodeapp:nodejs /app/uploads
# nodeapp 사용자로 실행
exec runuser -u nodeapp -- "$@"
