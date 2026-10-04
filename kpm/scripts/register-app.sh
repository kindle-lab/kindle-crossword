#!/bin/sh
set -eu

DB=/var/local/appreg.db
APP_ID=kindle.lab.korean.crossword
TARGET=/var/local/mesquite/korean-crossword

[ -d "$TARGET" ] || { echo "앱 파일이 없습니다: $TARGET" >&2; exit 1; }
[ -x /usr/bin/sqlite3 ] || { echo "sqlite3를 찾을 수 없습니다." >&2; exit 1; }
sqlite3 "$DB" <<SQL
INSERT OR IGNORE INTO interfaces(interface) VALUES('application');
INSERT OR IGNORE INTO handlerIds(handlerId) VALUES('$APP_ID');
INSERT OR REPLACE INTO properties(handlerId,name,value)
  VALUES('$APP_ID','lipcId','$APP_ID');
INSERT OR REPLACE INTO properties(handlerId,name,value)
  VALUES('$APP_ID','command','/usr/bin/mesquite -l $APP_ID -c file://$TARGET/');
INSERT OR REPLACE INTO properties(handlerId,name,value)
  VALUES('$APP_ID','supportedOrientation','U');
SQL
