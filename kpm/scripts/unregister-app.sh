#!/bin/sh
set -eu

DB=/var/local/appreg.db
APP_ID=kindle.lab.crossword
OLD_APP_ID=kindle.lab.korean.crossword

[ -x /usr/bin/sqlite3 ] || exit 0
[ -f "$DB" ] || exit 0

if command -v lipc-set-prop >/dev/null 2>&1; then
    lipc-set-prop com.lab126.appmgrd stop "app://$APP_ID" >/dev/null 2>&1 || true
    lipc-set-prop com.lab126.appmgrd stop "app://$OLD_APP_ID" >/dev/null 2>&1 || true
fi

HAS_ASSOC=$(/usr/bin/sqlite3 "$DB" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='associations';")
if [ "$HAS_ASSOC" = "1" ]; then
    /usr/bin/sqlite3 "$DB" "DELETE FROM associations WHERE handlerId IN ('$APP_ID','$OLD_APP_ID');"
fi

/usr/bin/sqlite3 "$DB" <<SQL
DELETE FROM properties WHERE handlerId='$APP_ID';
DELETE FROM handlerIds WHERE handlerId='$APP_ID';
DELETE FROM properties WHERE handlerId='$OLD_APP_ID';
DELETE FROM handlerIds WHERE handlerId='$OLD_APP_ID';
SQL
