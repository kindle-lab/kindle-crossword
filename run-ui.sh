#!/bin/sh
set -eu

SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -x "$SELF_DIR/bin/korean-crossword" ]; then
    PLAYER="$SELF_DIR/bin/korean-crossword"
elif [ -x "$SELF_DIR/build/korean-crossword" ]; then
    PLAYER="$SELF_DIR/build/korean-crossword"
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

choose_puzzle() {
    if [ -n "${1:-}" ]; then
        printf '%s\n' "$1"
        return 0
    fi
    if [ ! -s "$DATA_DIR/current.json" ] && ! find "$DATA_DIR/puzzles" -maxdepth 1 -type f -name '*.json' -print -quit 2>/dev/null | grep -q .; then
        echo "저장된 퍼즐이 없습니다. 네트워크 연결 후 다시 실행하세요." >&2
        return 1
    fi
    printf '%s\n' '한국일보 크로스워드 — 날짜 선택' >&2
    printf '%s\n' '1) 최신 저장 퍼즐' >&2
    index=2
    for path in $(find "$DATA_DIR/puzzles" -maxdepth 1 -type f -name '*.json' -print 2>/dev/null | sort -r); do
        printf '%s) %s\n' "$index" "$(basename "$path" .json)" >&2
        index=$((index + 1))
    done
    printf '%s' '번호 (Enter=최신): ' >&2
    IFS= read -r choice || choice=1
    choice=${choice:-1}
    case "$choice" in
        1) printf '%s\n' "$DATA_DIR/current.json"; return 0 ;;
    esac
    index=2
    for path in $(find "$DATA_DIR/puzzles" -maxdepth 1 -type f -name '*.json' -print 2>/dev/null | sort -r); do
        if [ "$choice" = "$index" ]; then
            printf '%s\n' "$path"
            return 0
        fi
        index=$((index + 1))
    done
    echo "잘못된 번호입니다." >&2
    return 1
}

PUZZLE=$(choose_puzzle "${1:-}") || exit 1
if [ ! -s "$PUZZLE" ]; then
    echo "선택한 퍼즐 파일이 없습니다." >&2
    exit 1
fi

exec "$PLAYER" --play "$PUZZLE"
