#!/bin/sh
set -eu

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
PLATFORM=${PLATFORM:-kindlehf}
VERSION=${CROSSWORD_VERSION:-0.2.0}
case "$PLATFORM" in
    kindlehf) ;;
    *) echo "this release supports kindlehf only" >&2; exit 2 ;;
esac

mkdir -p "$ROOT/dist"
STAGE=$(mktemp -d "$ROOT/dist/.korean-crossword.XXXXXX")
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT HUP INT TERM
mkdir -p "$STAGE/app" "$STAGE/scripts" "$STAGE/scriptlet" "$STAGE/assets"
cp "$ROOT/kpm/manifest.json" "$ROOT/kpm/launch.sh" "$ROOT/kpm/install.sh" \
    "$ROOT/kpm/uninstall.sh" "$STAGE/"
cp "$ROOT/kpm/scripts/register-app.sh" "$ROOT/kpm/scripts/unregister-app.sh" "$STAGE/scripts/"
cp "$ROOT/kpm/scriptlet/korean-crossword.sh" "$STAGE/scriptlet/"
cp "$ROOT/assets/korean-crossword-cover.png" "$STAGE/assets/"
cp "$ROOT/app/config.xml" "$ROOT/app/index.html" "$ROOT/app/app.js" "$ROOT/app/app.css" "$STAGE/app/"
chmod 700 "$STAGE"/*.sh "$STAGE/scripts/register-app.sh" "$STAGE/scripts/unregister-app.sh" \
    "$STAGE/scriptlet/korean-crossword.sh"
chmod 644 "$STAGE/assets/korean-crossword-cover.png" "$STAGE/app/"*

ARCHIVE="$ROOT/dist/korean-crossword-${PLATFORM}.kpkg"
rm -f "$ARCHIVE"
tar -C "$STAGE" -czf "$ARCHIVE" \
    manifest.json launch.sh install.sh uninstall.sh app assets scripts scriptlet
python3 "$ROOT/tools/verify-package.py" "$ARCHIVE"
sha256sum "$ARCHIVE" >"$ROOT/dist/SHA256SUMS"
echo "version $VERSION"
echo "$ARCHIVE"
