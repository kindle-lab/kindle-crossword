#!/bin/sh
set -eu

SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
"$SELF_DIR/scripts/unregister-app.sh"
rm -rf /var/local/mesquite/korean-crossword
rm -f '/mnt/us/documents/Korean Crossword.sh' /mnt/us/korean-crossword-cover.png
echo "한국일보 크로스워드 독립 앱을 제거했습니다. 캐시와 설정은 보존됩니다."
