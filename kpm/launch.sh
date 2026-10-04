#!/bin/sh
set -eu

SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -n "${KOREAN_CROSSWORD_DATA_DIR:-}" ]; then
    export KOREAN_CROSSWORD_DATA_DIR
elif [ -w /var/local ]; then
    export KOREAN_CROSSWORD_DATA_DIR=/var/local/korean-crossword
else
    export KOREAN_CROSSWORD_DATA_DIR=/mnt/us/korean-crossword
fi

case "${1:-}" in
    --ui)
        exec "$SELF_DIR/run-ui.sh"
        ;;
    --fetch)
        exec "$SELF_DIR/scripts/fetch-puzzle.sh"
        ;;
    "")
        mkdir -p "$KOREAN_CROSSWORD_DATA_DIR/logs"
        if ! "$SELF_DIR/scripts/fetch-puzzle.sh" >"$KOREAN_CROSSWORD_DATA_DIR/logs/fetch.log" 2>&1; then
            echo "network fetch failed; trying the saved puzzle" >>"$KOREAN_CROSSWORD_DATA_DIR/logs/fetch.log"
        fi
        KPM=${KOREAN_CROSSWORD_KPM:-/var/local/kmc/bin/kpm}
        exec "$KPM" launch kterm -e "$KPM launch korean-crossword --ui" \
            2>"$KOREAN_CROSSWORD_DATA_DIR/logs/startup.log"
        ;;
    *)
        exec "$SELF_DIR/bin/korean-crossword" "$@"
        ;;
esac
