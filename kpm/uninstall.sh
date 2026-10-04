#!/bin/sh
set -eu

SCRIPTLET=/mnt/us/documents/Korean\ Crossword.sh
BACKUP=/mnt/us/documents/Korean\ Crossword.sh.bak
if [ -f "$BACKUP" ]; then
    mv "$BACKUP" "$SCRIPTLET"
elif [ -f "$SCRIPTLET" ]; then
    rm -f "$SCRIPTLET"
fi
echo "한국일보 크로스워드 실행 항목을 제거했습니다. 캐시와 설정은 보존됩니다."
