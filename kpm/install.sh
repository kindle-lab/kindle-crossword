#!/bin/sh
set -eu

SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TARGET=/var/local/mesquite/korean-crossword
TMP_TARGET=/var/local/mesquite/korean-crossword.new.$$
OLD_TARGET=/var/local/mesquite/korean-crossword.old.$$
SCRIPTLET='/mnt/us/documents/Korean Crossword.sh'
ICON=/mnt/us/korean-crossword-cover.png
SCRIPTLET_OLD='/mnt/us/documents/Korean Crossword.sh.bak'

umask 077
if [ "${KINDLE_PLATFORM:-kindlehf}" != "kindlehf" ]; then
    echo "한국일보 크로스워드는 Kindle Basic 11세대(kindlehf)용입니다." >&2
    exit 1
fi
if [ ! -d /mnt/us/documents ]; then
    echo "Kindle documents directory is unavailable" >&2
    exit 1
fi
if [ ! -x /usr/bin/mesquite ] || [ ! -x /usr/bin/sqlite3 ]; then
    echo "mesquite와 sqlite3가 필요한 Kindle 환경이 아닙니다." >&2
    exit 1
fi
cleanup() { rm -rf "$TMP_TARGET"; }
rollback() {
    cleanup
    if [ -d "$OLD_TARGET" ]; then mv "$OLD_TARGET" "$TARGET"; fi
    if [ -f "$SCRIPTLET_OLD" ]; then mv "$SCRIPTLET_OLD" "$SCRIPTLET"; fi
}
trap 'rollback' HUP INT TERM
rm -rf "$TMP_TARGET"
mkdir -p /var/local/mesquite "$TMP_TARGET"
cp -R "$SELF_DIR/app/." "$TMP_TARGET/"
chmod 755 /var/local/mesquite "$TMP_TARGET"
chmod 644 "$TMP_TARGET/config.xml" "$TMP_TARGET/index.html" "$TMP_TARGET/core.js" "$TMP_TARGET/app.js" "$TMP_TARGET/app.css"
if [ -e "$TARGET" ]; then rm -rf "$OLD_TARGET"; mv "$TARGET" "$OLD_TARGET"; fi
mv "$TMP_TARGET" "$TARGET"
if [ -f "$SCRIPTLET" ]; then cp "$SCRIPTLET" "$SCRIPTLET_OLD"; fi
cp "$SELF_DIR/scriptlet/korean-crossword.sh" "$SCRIPTLET"
cp "$SELF_DIR/assets/korean-crossword-cover.png" "$ICON"
chmod 700 "$SCRIPTLET"
chmod 644 "$ICON"
if ! "$SELF_DIR/scripts/register-app.sh"; then
    rollback
    echo "설치 실패: 기존 앱과 Scriptlet을 복구했습니다." >&2
    exit 1
fi
rm -rf "$OLD_TARGET" "$SCRIPTLET_OLD"
trap - HUP INT TERM
echo "한국일보 크로스워드 v0.4.5 독립 앱이 설치되었습니다."
echo "기존 한국어 IME는 자동 설치하지 않았으며, 앱의 표준 입력창에서 사용할 수 있습니다."
echo "퍼즐 캐시와 진행 데이터는 삭제하지 않고 보존됩니다."
