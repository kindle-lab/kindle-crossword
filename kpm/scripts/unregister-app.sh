#!/bin/sh
set -eu

DB=/var/local/appreg.db
APP_ID=kindle.lab.korean.crossword

[ -x /usr/bin/sqlite3 ] || exit 0
sqlite3 "$DB" <<SQL
DELETE FROM properties WHERE handlerId='$APP_ID';
DELETE FROM handlerIds WHERE handlerId='$APP_ID';
SQL
