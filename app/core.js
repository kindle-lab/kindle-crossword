(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CrosswordCore = api;
}(this, function () {
  "use strict";

  var GRID_SIZE = 10;

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function cleanText(value) {
    return value == null ? "" : String(value);
  }

  function cleanAnswer(value) {
    return cleanText(value).replace(/\s/g, "");
  }

  function utf8FromBinary(binary) {
    var encoded = "", i;
    for (i = 0; i < binary.length; i++) {
      encoded += "%" + ("0" + binary.charCodeAt(i).toString(16)).slice(-2);
    }
    try { return decodeURIComponent(encoded); } catch (e) { return binary; }
  }

  function base64UrlDecode(value) {
    var normalized = cleanText(value).replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    if (typeof atob === "function") return utf8FromBinary(atob(normalized));
    if (typeof Buffer !== "undefined") return Buffer.from(normalized, "base64").toString("utf8");
    throw new Error("base64 decoder is unavailable");
  }

  function unwrapResponse(raw) {
    var data = raw, token, middle, decoded;
    if (!data || typeof data !== "object") throw new Error("퍼즐 응답이 비어 있습니다.");
    if (data.encode_data) {
      token = cleanText(data.encode_data).split(".");
      middle = token.length > 1 ? token[1] : token[0];
      decoded = base64UrlDecode(middle);
      data = JSON.parse(decoded);
    }
    if (data && typeof data.body === "string") {
      data = copyObject(data);
      data.body = JSON.parse(data.body);
    }
    return data;
  }

  function copyObject(source) {
    var target = {}, key;
    for (key in source) if (own(source, key)) target[key] = source[key];
    return target;
  }

  function sortedKeys(obj) {
    var keys = [], key;
    for (key in obj) if (own(obj, key)) keys.push(key);
    keys.sort(function (a, b) {
      var an = parseInt(a, 10), bn = parseInt(b, 10);
      if (!isNaN(an) && !isNaN(bn) && an !== bn) return an - bn;
      return a < b ? -1 : (a > b ? 1 : 0);
    });
    return keys;
  }

  function firstValue(objects, names) {
    var i, j, obj, name, value;
    for (i = 0; i < objects.length; i++) {
      obj = objects[i];
      if (!obj || typeof obj !== "object") continue;
      for (j = 0; j < names.length; j++) {
        name = names[j];
        if (own(obj, name)) {
          value = obj[name];
          if (value !== null && value !== undefined && cleanText(value) !== "") return cleanText(value);
        }
      }
    }
    return "";
  }

  function normalizeDate(value) {
    var text = cleanText(value), match;
    match = text.match(/(20\d{2})[-\/.]?(\d{2})[-\/.]?(\d{2})/);
    return match ? match[1] + "-" + match[2] + "-" + match[3] : "";
  }

  function safeId(value) {
    return cleanText(value).replace(/[^A-Za-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);
  }

  function fnv1a(text) {
    var hash = 2166136261, i;
    for (i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    hash = hash >>> 0;
    return ("00000000" + hash.toString(16)).slice(-8);
  }

  function blankGrid() {
    var grid = [], r, c;
    for (r = 0; r < GRID_SIZE; r++) {
      grid[r] = [];
      for (c = 0; c < GRID_SIZE; c++) {
        grid[r][c] = {
          key: r + "," + c,
          row: r,
          col: c,
          occupied: false,
          solution: "",
          across: null,
          down: null,
          number: ""
        };
      }
    }
    return grid;
  }

  function parseSection(body, direction, grid, clues, clueMap) {
    var source = body[direction] || {}, keys = sortedKeys(source), i, key, raw, answer;
    var clue, n, row, col, cell, id;
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      raw = source[key] || {};
      answer = cleanAnswer(raw.answer);
      id = direction + ":" + key;
      clue = {
        id: id,
        number: parseInt(key, 10),
        numberText: cleanText(key),
        direction: direction,
        answer: answer,
        row: parseInt(raw.row, 10),
        col: parseInt(raw.col, 10),
        clue: cleanText(raw.clue),
        definition: cleanText(raw.definition),
        articleUrl: cleanText(raw.articleUrl),
        cells: []
      };
      if (!answer || isNaN(clue.row) || isNaN(clue.col)) throw new Error("단서 데이터가 불완전합니다: " + id);
      for (n = 0; n < answer.length; n++) {
        row = clue.row + (direction === "down" ? n : 0);
        col = clue.col + (direction === "across" ? n : 0);
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) throw new Error("단서가 10×10 격자를 벗어납니다: " + id);
        cell = grid[row][col];
        if (cell.solution && cell.solution !== answer.charAt(n)) throw new Error("교차 문자가 충돌합니다: " + id);
        cell.solution = answer.charAt(n);
        cell.occupied = true;
        cell[direction] = id;
        if (n === 0 && !cell.number) cell.number = clue.numberText;
        clue.cells.push(cell.key);
      }
      clues.push(clue);
      clueMap[id] = clue;
    }
  }

  function canonicalClues(clues) {
    var rows = [], i, clue;
    for (i = 0; i < clues.length; i++) {
      clue = clues[i];
      rows.push([
        clue.direction, clue.numberText, clue.row, clue.col, clue.answer,
        clue.clue, clue.definition, clue.articleUrl
      ].join("\u001f"));
    }
    rows.sort();
    return rows.join("\u001e");
  }

  function buildPuzzle(raw) {
    var data = unwrapResponse(raw), body, grid, clues = [], clueMap = {};
    var sourceId, sourceDate, fingerprint, id, firstClue;
    if (data.statusCode && Number(data.statusCode) !== 200) throw new Error("퍼즐 서버가 오류를 반환했습니다.");
    body = data.body || ((data.across || data.down) ? data : null);
    if (!body || typeof body !== "object") throw new Error("퍼즐 본문이 없습니다.");
    grid = blankGrid();
    parseSection(body, "across", grid, clues, clueMap);
    parseSection(body, "down", grid, clues, clueMap);
    if (!clues.length) throw new Error("퍼즐 단서가 없습니다.");

    fingerprint = fnv1a(canonicalClues(clues));
    sourceId = firstValue([data, body], ["puzzleId", "puzzle_id", "gameId", "game_id", "crosswordId", "crossword_id"]);
    sourceDate = normalizeDate(firstValue([data, body], ["puzzleDate", "puzzle_date", "publishDate", "publishedAt", "published_at", "date"]));
    id = sourceId ? "src-" + safeId(sourceId) + "-" + fingerprint : "fp-" + fingerprint;
    if (sourceDate && !sourceId) id = "date-" + sourceDate + "-" + fingerprint;
    firstClue = clues[0];

    return {
      id: id,
      sourceId: sourceId,
      sourceDate: sourceDate,
      fingerprint: fingerprint,
      gridSize: GRID_SIZE,
      grid: grid,
      clues: clues,
      clueMap: clueMap,
      firstCellKey: firstClue.cells[0],
      body: body
    };
  }

  function emptyProgress(puzzle) {
    return { cells: {}, selectedKey: puzzle.firstCellKey, direction: puzzle.clues[0].direction };
  }

  function normalizeProgress(puzzle, raw) {
    var progress = emptyProgress(puzzle), key, value, parts, row, col;
    raw = raw || {};
    if (raw.cells && typeof raw.cells === "object") {
      for (key in raw.cells) if (own(raw.cells, key)) {
        parts = key.split(",");
        row = parseInt(parts[0], 10); col = parseInt(parts[1], 10);
        if (!isNaN(row) && !isNaN(col) && row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE && puzzle.grid[row][col].occupied) {
          value = cleanAnswer(raw.cells[key]);
          if (value) progress.cells[key] = value.charAt(value.length - 1);
        }
      }
    }
    if (raw.direction === "across" || raw.direction === "down") progress.direction = raw.direction;
    if (raw.selectedKey) {
      parts = cleanText(raw.selectedKey).split(",");
      row = parseInt(parts[0], 10); col = parseInt(parts[1], 10);
      if (!isNaN(row) && !isNaN(col) && row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE && puzzle.grid[row][col].occupied) progress.selectedKey = row + "," + col;
    }
    return progress;
  }

  function getCell(puzzle, key) {
    var parts = cleanText(key).split(","), row = parseInt(parts[0], 10), col = parseInt(parts[1], 10);
    if (isNaN(row) || isNaN(col) || row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return puzzle.grid[row][col];
  }

  function setCell(puzzle, progress, key, value) {
    var cell = getCell(puzzle, key), text;
    if (!cell || !cell.occupied) return false;
    text = cleanAnswer(value);
    if (!text) delete progress.cells[key];
    else progress.cells[key] = text.charAt(text.length - 1);
    return true;
  }

  function cellValue(progress, key) {
    return own(progress.cells, key) ? progress.cells[key] : "";
  }

  function clueValue(puzzle, progress, clue) {
    var value = "", i;
    clue = typeof clue === "string" ? puzzle.clueMap[clue] : clue;
    if (!clue) return "";
    for (i = 0; i < clue.cells.length; i++) value += cellValue(progress, clue.cells[i]);
    return value;
  }

  function isClueComplete(puzzle, progress, clue) {
    var i;
    clue = typeof clue === "string" ? puzzle.clueMap[clue] : clue;
    if (!clue) return false;
    for (i = 0; i < clue.cells.length; i++) if (!cellValue(progress, clue.cells[i])) return false;
    return true;
  }

  function isClueCorrect(puzzle, progress, clue) {
    clue = typeof clue === "string" ? puzzle.clueMap[clue] : clue;
    return !!clue && isClueComplete(puzzle, progress, clue) && clueValue(puzzle, progress, clue) === clue.answer;
  }

  function cluesForCell(puzzle, key) {
    var cell = getCell(puzzle, key), result = [];
    if (!cell) return result;
    if (cell.across) result.push(puzzle.clueMap[cell.across]);
    if (cell.down) result.push(puzzle.clueMap[cell.down]);
    return result;
  }

  function chooseClueForCell(puzzle, key, direction) {
    var cell = getCell(puzzle, key);
    if (!cell) return null;
    if (direction === "down" && cell.down) return puzzle.clueMap[cell.down];
    if (direction === "across" && cell.across) return puzzle.clueMap[cell.across];
    if (cell.across) return puzzle.clueMap[cell.across];
    if (cell.down) return puzzle.clueMap[cell.down];
    return null;
  }

  function nextCellKey(clue, currentKey, delta) {
    var i, next;
    if (!clue || !clue.cells.length) return currentKey;
    i = clue.cells.indexOf(currentKey);
    if (i < 0) i = 0;
    next = i + delta;
    if (next < 0) next = 0;
    if (next >= clue.cells.length) next = clue.cells.length - 1;
    return clue.cells[next];
  }

  function clueLabel(clue) {
    if (!clue) return "단서";
    return (clue.direction === "across" ? "가로 " : "세로 ") + clue.numberText;
  }

  return {
    GRID_SIZE: GRID_SIZE,
    unwrapResponse: unwrapResponse,
    buildPuzzle: buildPuzzle,
    emptyProgress: emptyProgress,
    normalizeProgress: normalizeProgress,
    getCell: getCell,
    setCell: setCell,
    cellValue: cellValue,
    clueValue: clueValue,
    isClueComplete: isClueComplete,
    isClueCorrect: isClueCorrect,
    cluesForCell: cluesForCell,
    chooseClueForCell: chooseClueForCell,
    nextCellKey: nextCellKey,
    clueLabel: clueLabel
  };
}));
