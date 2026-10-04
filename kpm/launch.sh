#!/bin/sh
set -eu

SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_ID=kindle.lab.crossword

"$SELF_DIR/scripts/register-app.sh"
nohup lipc-set-prop com.lab126.appmgrd start "app://$APP_ID" >/dev/null 2>&1 &
exit 0
