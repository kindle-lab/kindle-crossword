#!/bin/sh
set -eu

SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -x "$SELF_DIR/../bin/korean-crossword" ]; then
    VALIDATOR="$SELF_DIR/../bin/korean-crossword"
elif [ -x "$SELF_DIR/../build/korean-crossword" ]; then
    VALIDATOR="$SELF_DIR/../build/korean-crossword"
else
    echo "korean-crossword executable is missing" >&2
    exit 1
fi
if [ -n "${KOREAN_CROSSWORD_DATA_DIR:-}" ]; then
    DATA_DIR=$KOREAN_CROSSWORD_DATA_DIR
elif [ -w /var/local ]; then
    DATA_DIR=/var/local/korean-crossword
else
    DATA_DIR=/mnt/us/korean-crossword
fi

ENDPOINT=${KOREAN_CROSSWORD_ENDPOINT:-https://d3owq5b4yti859.cloudfront.net/puzzle.json}
DATE=${1:-$(date +%Y-%m-%d)}
case "$DATE" in
    ????-??-??) ;;
    *) echo "date must be YYYY-MM-DD" >&2; exit 2 ;;
esac

mkdir -p "$DATA_DIR/puzzles" "$DATA_DIR/logs" "$DATA_DIR/metadata"
TMP=$(mktemp "$DATA_DIR/.puzzle.XXXXXX")
VALIDATION="$DATA_DIR/.validation.$$"
cleanup() {
    rm -f "$TMP" "$VALIDATION"
}
trap cleanup EXIT HUP INT TERM

if command -v curl >/dev/null 2>&1; then
    curl -fsSL --connect-timeout 15 --max-time 60 "$ENDPOINT" >"$TMP"
elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$TMP" "$ENDPOINT"
else
    echo "curl or wget is required" >&2
    exit 1
fi

if ! "$VALIDATOR" --validate "$TMP" >"$VALIDATION" 2>&1; then
    cat "$VALIDATION" >&2
    echo "downloaded response was rejected; existing cache was preserved" >&2
    exit 1
fi

TARGET="$DATA_DIR/puzzles/$DATE.json"
mv "$TMP" "$TARGET"
cp "$TARGET" "$DATA_DIR/current.json"
{
    echo "date=$DATE"
    echo "source=$ENDPOINT"
    echo "validated=yes"
    cat "$VALIDATION"
} >"$DATA_DIR/metadata/$DATE.txt"
echo "$TARGET"
