#!/bin/sh
set -eu

SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
umask 077
if [ "${KINDLE_PLATFORM:-kindlehf}" != "kindlehf" ]; then
    echo "한국일보 크로스워드는 Kindle Basic 11세대(kindlehf)용입니다." >&2
    exit 1
fi
if [ ! -d /mnt/us/documents ]; then
    echo "Kindle documents directory is unavailable" >&2
    exit 1
fi

SCRIPTLET=/mnt/us/documents/한국일보\ 크로스워드.sh
LEGACY_SCRIPTLET=/mnt/us/documents/Korean\ Crossword.sh
ICON=/mnt/us/korean-crossword-icon.png
BACKUP=/mnt/us/documents/한국일보\ 크로스워드.sh.bak
if [ -f "$SCRIPTLET" ]; then
    cp "$SCRIPTLET" "$BACKUP"
fi
if ! cp "$SELF_DIR/scriptlet/korean-crossword.sh" "$SCRIPTLET"; then
    if [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$SCRIPTLET"
    fi
    echo "설치 실패: 기존 Scriptlet을 복구했습니다." >&2
    exit 1
fi
rm -f "$LEGACY_SCRIPTLET"
if ! cp "$SELF_DIR/assets/korean-crossword-icon.png" "$ICON"; then
    if [ -f "$BACKUP" ]; then
        cp "$BACKUP" "$SCRIPTLET"
    else
        rm -f "$SCRIPTLET"
    fi
    echo "설치 실패: 아이콘을 복사하지 못했습니다." >&2
    exit 1
fi
chmod 700 "$SELF_DIR/launch.sh" "$SELF_DIR/run-ui.sh" \
    "$SELF_DIR/scripts/fetch-puzzle.sh" "$SELF_DIR/uninstall.sh" \
    "$SELF_DIR/bin/korean-crossword" "$SCRIPTLET"
chmod 644 "$ICON"
echo "한국일보 크로스워드가 설치되었습니다. 기존 한국어 IME는 자동 설치하지 않았습니다."
echo "퍼즐 캐시와 진행 데이터는 삭제하지 않고 보존됩니다."
