#!/bin/sh
set -eu
BIN=${1:?binary required}
FIXTURE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/fixtures/payload.json
OUT=$($BIN --validate "$FIXTURE")
case "$OUT" in
  "valid grid=10x10 clues=4") ;;
  *) echo "unexpected validation output: $OUT" >&2; exit 1 ;;
esac
$BIN --summary "$FIXTURE" | grep -F '. 경 유' >/dev/null
if $BIN --validate "$FIXTURE.missing" >/dev/null 2>&1; then
  echo "missing file unexpectedly accepted" >&2
  exit 1
fi
echo "parser tests passed"
