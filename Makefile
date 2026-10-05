.PHONY: all test clean package

all: test

test:
	node tests/test-core.js
	sh tests/test-app.sh

package:
	PLATFORM=kindlehf CROSSWORD_VERSION="$${CROSSWORD_VERSION:-0.4.5}" tools/build-kpkg.sh

clean:
	rm -rf build dist
