CC ?= cc
CFLAGS ?= -O2 -std=c99 -Wall -Wextra -Wpedantic
CPPFLAGS ?= -Isrc
LDFLAGS ?=

BUILD := build
BIN := $(BUILD)/korean-crossword

.PHONY: all test clean package

all: $(BIN)

$(BUILD):
	mkdir -p $(BUILD)

$(BIN): src/main.c src/crossword.c src/crossword.h | $(BUILD)
	$(CC) $(CPPFLAGS) $(CFLAGS) -o $@ src/main.c src/crossword.c $(LDFLAGS)

test: $(BIN)
	sh tests/test_parser.sh ./$(BIN)
	sh tests/test-app.sh

package:
	PLATFORM=kindlehf CROSSWORD_VERSION="$${CROSSWORD_VERSION:-0.2.0}" tools/build-kpkg.sh

clean:
	rm -rf $(BUILD) dist
