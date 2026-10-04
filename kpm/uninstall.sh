#!/bin/sh
set -eu

SCRIPTLET=/mnt/us/documents/한국일보\ 크로스워드.sh
ICON=/mnt/us/korean-crossword-icon.png
BACKUP=/mnt/us/documents/한국일보\ 크로스워드.sh.bak
if [ -f "$BACKUP" ]; then
    mv "$BACKUP" "$SCRIPTLET"
elif [ -f "$SCRIPTLET" ]; then
    rm -f "$SCRIPTLET"
fi
rm -f "$ICON"
echo "한국일보 크로스워드 실행 항목을 제거했습니다. 캐시와 설정은 보존됩니다."
