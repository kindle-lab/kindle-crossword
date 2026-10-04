#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PLATFORM=${PLATFORM:-kindlehf}
VERSION=${CROSSWORD_VERSION:-0.1.0}
CC=${CROSS_CC:-arm-kindlehf-linux-gnueabihf-gcc}
CFLAGS=${CROSS_CFLAGS--O2 -std=c99 -Wall -Wextra -Wpedantic}
LDFLAGS=${CROSS_LDFLAGS--static}
case "$PLATFORM" in
    kindlehf) ;;
    *) echo "this release supports kindlehf only" >&2; exit 2 ;;
esac
if ! command -v "$CC" >/dev/null 2>&1; then
    echo "Kindle ARM cross compiler not found: $CC" >&2
    echo "Install the kindlehf toolchain or pass CROSS_CC=/path/to/compiler." >&2
    exit 127
fi

mkdir -p "$ROOT/build" "$ROOT/dist"
"$CC" -Isrc $CFLAGS $LDFLAGS \
    -o "$ROOT/build/korean-crossword" \
    "$ROOT/src/main.c" "$ROOT/src/crossword.c"

STAGE=$(mktemp -d "$ROOT/dist/.korean-crossword.XXXXXX")
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT HUP INT TERM
mkdir -p "$STAGE/bin" "$STAGE/scripts" "$STAGE/scriptlet"
cp "$ROOT/kpm/manifest.json" "$ROOT/kpm/launch.sh" "$ROOT/kpm/install.sh" \
    "$ROOT/kpm/uninstall.sh" "$ROOT/run-ui.sh" "$STAGE/"
cp "$ROOT/scripts/fetch-puzzle.sh" "$STAGE/scripts/"
cp "$ROOT/kpm/scriptlet/korean-crossword.sh" "$STAGE/scriptlet/"
cp "$ROOT/build/korean-crossword" "$STAGE/bin/"
chmod 700 "$STAGE"/*.sh "$STAGE/scripts/fetch-puzzle.sh" \
    "$STAGE/scriptlet/korean-crossword.sh" "$STAGE/bin/korean-crossword"

ARCHIVE="$ROOT/dist/korean-crossword-${PLATFORM}.kpkg"
rm -f "$ARCHIVE"
tar -C "$STAGE" -czf "$ARCHIVE" \
    manifest.json launch.sh install.sh uninstall.sh run-ui.sh scripts scriptlet bin
python3 "$ROOT/tools/verify-package.py" "$ARCHIVE"
sha256sum "$ARCHIVE" >"$ROOT/dist/SHA256SUMS"
echo "$ARCHIVE"
