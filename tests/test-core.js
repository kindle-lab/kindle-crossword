"use strict";

var fs = require("fs");
var path = require("path");
var assert = require("assert");
var Core = require(path.join(__dirname, "..", "app", "core.js"));
var fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "payload.json"), "utf8"));

var puzzle = Core.buildPuzzle(fixture);
assert.strictEqual(puzzle.gridSize, 10);
assert.strictEqual(puzzle.clues.length, 4);
assert.strictEqual(puzzle.grid[1][2].across, "across:1");
assert.strictEqual(puzzle.grid[1][2].down, "down:1");
assert.strictEqual(puzzle.clueMap["across:1"].articleUrl, "https://www.hankookilbo.com/");
assert.ok(/^fp-/.test(puzzle.id), "fixture without source metadata uses content fingerprint");

var progress = Core.emptyProgress(puzzle);
Core.setCell(puzzle, progress, "1,1", "경");
Core.setCell(puzzle, progress, "1,2", "유");
assert.strictEqual(Core.isClueCorrect(puzzle, progress, "across:1"), true);
assert.strictEqual(Core.isClueCorrect(puzzle, progress, "down:1"), false);
Core.setCell(puzzle, progress, "2,2", "도");
assert.strictEqual(Core.isClueCorrect(puzzle, progress, "down:1"), true);

Core.setCell(puzzle, progress, "1,2", "도");
assert.strictEqual(Core.isClueCorrect(puzzle, progress, "across:1"), false);
assert.strictEqual(Core.isClueCorrect(puzzle, progress, "down:1"), false);
assert.strictEqual(Core.clueValue(puzzle, progress, "across:1"), "경도");
assert.strictEqual(Core.clueValue(puzzle, progress, "down:1"), "도도");

var dated = JSON.parse(JSON.stringify(fixture));
dated.body.puzzleDate = "2026-10-05";
var datedPuzzle = Core.buildPuzzle(dated);
assert.strictEqual(datedPuzzle.sourceDate, "2026-10-05");
assert.ok(/^date-2026-10-05-/.test(datedPuzzle.id));

var payload = Buffer.from(JSON.stringify(fixture), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
var wrapped = Core.buildPuzzle({ encode_data: "x." + payload + ".y" });
assert.strictEqual(wrapped.fingerprint, puzzle.fingerprint);

var restored = Core.normalizeProgress(puzzle, { cells: { "1,1": "경", "9,9": "X", "bad": "Y" }, selectedKey: "1,1", direction: "down" });
assert.strictEqual(restored.cells["1,1"], "경");
assert.strictEqual(restored.cells["9,9"], undefined);
assert.strictEqual(restored.selectedKey, "1,1");
assert.strictEqual(restored.direction, "down");

console.log("core logic tests passed");
