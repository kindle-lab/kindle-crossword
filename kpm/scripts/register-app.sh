#!/bin/sh
set -eu

DB=/var/local/appreg.db
APP_ID=kindle.lab.crossword
OLD_APP_ID=kindle.lab.korean.crossword
TARGET=/var/local/mesquite/korean-crossword

[ -d "$TARGET" ] || { echo "앱 파일이 없습니다: $TARGET" >&2; exit 1; }
[ -f "$TARGET/config.xml" ] || { echo "config.xml이 없습니다: $TARGET/config.xml" >&2; exit 1; }
[ -x /usr/bin/sqlite3 ] || { echo "sqlite3를 찾을 수 없습니다." >&2; exit 1; }
[ -f "$DB" ] || { echo "appreg.db를 찾을 수 없습니다." >&2; exit 1; }

# appmgrd may retain a running/stale instance while the registration is rewritten.
# Stop both the current and pre-v0.3 IDs before touching appreg.db.
if command -v lipc-set-prop >/dev/null 2>&1; then
    lipc-set-prop com.lab126.appmgrd stop "app://$APP_ID" >/dev/null 2>&1 || true
    lipc-set-prop com.lab126.appmgrd stop "app://$OLD_APP_ID" >/dev/null 2>&1 || true
    sleep 1
fi

HAS_ASSOC=$(/usr/bin/sqlite3 "$DB" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='associations';")

if [ "$HAS_ASSOC" = "1" ]; then
    /usr/bin/sqlite3 "$DB" "DELETE FROM associations WHERE handlerId IN ('$APP_ID','$OLD_APP_ID');"
fi

/usr/bin/sqlite3 "$DB" <<SQL
DELETE FROM properties WHERE handlerId='$OLD_APP_ID';
DELETE FROM handlerIds WHERE handlerId='$OLD_APP_ID';
DELETE FROM properties WHERE handlerId='$APP_ID';
DELETE FROM handlerIds WHERE handlerId='$APP_ID';
INSERT OR IGNORE INTO interfaces(interface) VALUES('application');
INSERT OR IGNORE INTO handlerIds(handlerId) VALUES('$APP_ID');
INSERT OR REPLACE INTO properties(handlerId,name,value)
  VALUES('$APP_ID','lipcId','$APP_ID');
INSERT OR REPLACE INTO properties(handlerId,name,value)
  VALUES('$APP_ID','command','/usr/bin/mesquite -l $APP_ID -c file://$TARGET/');
INSERT OR REPLACE INTO properties(handlerId,name,value)
  VALUES('$APP_ID','supportedOrientation','U');
SQL

# Newer Kindle app registries use the application association to resolve app:// IDs.
# Older KWordle-style registries may not have this table, so keep a compatible fallback.
if [ "$HAS_ASSOC" = "1" ]; then
    /usr/bin/sqlite3 "$DB" "INSERT OR IGNORE INTO associations(handlerId,interface,contentId,defaultAssoc) VALUES('$APP_ID','application','GL:$APP_ID',0);"
    echo "association=GL:$APP_ID"
else
    echo "association=table-unavailable"
fi
