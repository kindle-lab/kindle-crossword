#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
test -f "$ROOT/app/config.xml"
test -f "$ROOT/app/index.html"
test -f "$ROOT/app/app.js"
test -f "$ROOT/app/app.css"
grep -F 'kindle.lab.crossword' "$ROOT/app/config.xml" >/dev/null
grep -F 'http://kindle.amazon.com/ns/widget-extensions' "$ROOT/app/config.xml" >/dev/null
grep -F 'window.kindle' "$ROOT/app/index.html" >/dev/null
grep -F 'id="answer-input"' "$ROOT/app/index.html" >/dev/null
grep -F 'localStorage' "$ROOT/app/app.js" >/dev/null
grep -F 'XMLHttpRequest' "$ROOT/app/app.js" >/dev/null
grep -F 'register-app.sh' "$ROOT/kpm/launch.sh" >/dev/null
grep -F 'mesquite' "$ROOT/kpm/scripts/register-app.sh" >/dev/null
if grep -R -i 'kterm' "$ROOT/kpm" "$ROOT/app" >/dev/null; then
    echo "KTerm must not be part of the standalone app" >&2
    exit 1
fi
echo "standalone app tests passed"
