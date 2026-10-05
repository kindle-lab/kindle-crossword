#!/bin/sh
set -eu

SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_ID=kindle.lab.crossword
TARGET=/var/local/mesquite/korean-crossword
DB=/var/local/appreg.db
LOG=/mnt/us/korean-crossword-launch.log

{
    echo "=== Korean Crossword launch ==="
    date 2>/dev/null || true
    echo "app_id=$APP_ID"
    echo "target=$TARGET"
    [ -x /usr/bin/mesquite ] && echo "mesquite=ok" || echo "mesquite=missing"
    [ -f "$TARGET/config.xml" ] && echo "config=ok" || echo "config=missing"
} >>"$LOG" 2>&1

if ! "$SELF_DIR/scripts/register-app.sh" >>"$LOG" 2>&1; then
    echo "register=failed" >>"$LOG"
    exit 1
fi

echo "register=ok" >>"$LOG"
if [ -x /usr/bin/sqlite3 ]; then
    /usr/bin/sqlite3 "$DB" "SELECT name || '=' || value FROM properties WHERE handlerId='$APP_ID' ORDER BY name;" >>"$LOG" 2>&1 || true
fi

nohup lipc-set-prop com.lab126.appmgrd start "app://$APP_ID" >>"$LOG" 2>&1 &
echo "start=requested" >>"$LOG"
exit 0
