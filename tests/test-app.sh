#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

test -f "$ROOT/app/config.xml"
test -f "$ROOT/app/index.html"
test -f "$ROOT/app/core.js"
test -f "$ROOT/app/app.js"
test -f "$ROOT/app/app.css"

grep -F 'version="0.4.3"' "$ROOT/app/config.xml" >/dev/null
grep -F '<kindle:cookiejar>' "$ROOT/app/config.xml" >/dev/null
grep -F 'maxConnectionsPerProxy' "$ROOT/app/config.xml" >/dev/null
grep -F '<param name="todo" value="yes" />' "$ROOT/app/config.xml" >/dev/null
grep -F '<param name="winmgrUtils" value="yes" />' "$ROOT/app/config.xml" >/dev/null
grep -F '<kindle:app name="com.lab126.readnow" value="yes" />' "$ROOT/app/config.xml" >/dev/null
grep -F 'internetRequired" value="yes"' "$ROOT/app/config.xml" >/dev/null
if grep -F '<access origin="*"' "$ROOT/app/config.xml" >/dev/null; then
    echo "unproven W3C access element must not be in Kindle Mesquite config" >&2
    exit 1
fi
grep -F 'id="cell-input"' "$ROOT/app/index.html" >/dev/null
grep -F 'id="article-link"' "$ROOT/app/index.html" >/dev/null
grep -F '<script src="core.js"></script>' "$ROOT/app/index.html" >/dev/null
grep -F 'https://d3owq5b4yti859.cloudfront.net/puzzle.json' "$ROOT/app/app.js" >/dev/null
grep -F 'Core.setCell' "$ROOT/app/app.js" >/dev/null
grep -F 'articleUrl' "$ROOT/app/core.js" >/dev/null
grep -F 'fingerprint' "$ROOT/app/core.js" >/dev/null
grep -F 'associations' "$ROOT/kpm/scripts/register-app.sh" >/dev/null
grep -F 'GL:$APP_ID' "$ROOT/kpm/scripts/register-app.sh" >/dev/null
grep -F 'sleep 2' "$ROOT/kpm/launch.sh" >/dev/null
if grep -F 'state.entries' "$ROOT/app/app.js" >/dev/null; then
    echo "word-centric state must not return" >&2
    exit 1
fi
if grep -R -i 'kterm' "$ROOT/kpm" "$ROOT/app" >/dev/null; then
    echo "KTerm must not be part of the standalone app" >&2
    exit 1
fi

echo "standalone app contract tests passed"
