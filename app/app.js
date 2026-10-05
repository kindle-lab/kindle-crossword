(function () {
  "use strict";

  var Core = window.CrosswordCore;
  var ENDPOINT = "https://d3owq5b4yti859.cloudfront.net/puzzle.json";
  var PUZZLE_PREFIX = "crossword:v4:puzzle:";
  var PROGRESS_PREFIX = "crossword:v4:progress:";
  var INDEX_KEY = "crossword:v4:index";
  var MIGRATION_KEY = "crossword:v4:migrated-v3";
  var LEGACY_PREFIX = "crossword:puzzle:";
  var state = { puzzle: null, record: null, progress: null, composing: false };
  var els = {};

  function byId(id) { return document.getElementById(id); }
  function text(el, value) { while (el.firstChild) el.removeChild(el.firstChild); el.appendChild(document.createTextNode(value == null ? "" : String(value))); }
  function nowIso() { return new Date().toISOString(); }
  function datePart(iso) { return iso ? String(iso).slice(0, 10) : ""; }
  function setStatus(message, error) { text(els.status, message || ""); els.status.className = error ? "status error" : "status"; }
  function readJson(key, fallback) { try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; } }
  function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } }

  function readIndex() {
    var list = readJson(INDEX_KEY, []), clean = [], seen = {}, i, id;
    if (!list || typeof list.length !== "number") return clean;
    for (i = 0; i < list.length; i++) {
      id = String(list[i] || "");
      if (id && !seen[id] && localStorage.getItem(PUZZLE_PREFIX + id)) { clean.push(id); seen[id] = true; }
    }
    return clean;
  }
  function writeIndex(list) { writeJson(INDEX_KEY, list); }
  function recordLabel(record) {
    if (record.sourceDate) return record.sourceDate + " · 원본 날짜";
    return "저장본 · " + datePart(record.firstSeenAt || record.lastFetchedAt) + " · " + record.id.slice(-8);
  }

  function savePuzzle(raw, puzzle, fetchedAt) {
    var key = PUZZLE_PREFIX + puzzle.id, existing = readJson(key, null), index = readIndex(), next = [puzzle.id], i;
    var record = { schema: 4, id: puzzle.id, sourceId: puzzle.sourceId || "", sourceDate: puzzle.sourceDate || "", fingerprint: puzzle.fingerprint,
      firstSeenAt: existing && existing.firstSeenAt ? existing.firstSeenAt : fetchedAt, lastFetchedAt: fetchedAt, raw: raw };
    if (!writeJson(key, record)) throw new Error("퍼즐을 저장하지 못했습니다.");
    for (i = 0; i < index.length; i++) if (index[i] !== puzzle.id) next.push(index[i]);
    writeIndex(next.slice(0, 60));
    return record;
  }
  function getRecord(id) { return id ? readJson(PUZZLE_PREFIX + id, null) : null; }

  function saveProgress() {
    if (!state.puzzle || !state.progress) return;
    writeJson(PROGRESS_PREFIX + state.puzzle.id, { schema: 4, cells: state.progress.cells, selectedKey: state.progress.selectedKey, direction: state.progress.direction });
  }

  function migrateLegacyCache() {
    var i, key, item, raw, puzzle, fetchedAt;
    if (localStorage.getItem(MIGRATION_KEY)) return;
    try {
      for (i = 0; i < localStorage.length; i++) {
        key = localStorage.key(i);
        if (!key || key.indexOf(LEGACY_PREFIX) !== 0 || /:answers$/.test(key)) continue;
        item = readJson(key, null); raw = item && item.raw ? item.raw : null;
        if (!raw) continue;
        try { puzzle = Core.buildPuzzle(raw); fetchedAt = item.savedAt || nowIso(); savePuzzle(raw, puzzle, fetchedAt); } catch (ignore) {}
      }
      localStorage.setItem(MIGRATION_KEY, "1");
    } catch (e) {}
  }

  function currentCell() { return state.puzzle && state.progress ? Core.getCell(state.puzzle, state.progress.selectedKey) : null; }
  function currentClue() { return state.puzzle && state.progress ? Core.chooseClueForCell(state.puzzle, state.progress.selectedKey, state.progress.direction) : null; }

  function renderHistory() {
    var index = readIndex(), i, record, option;
    while (els.history.firstChild) els.history.removeChild(els.history.firstChild);
    if (!index.length) {
      option = document.createElement("option"); option.value = ""; text(option, "저장된 퍼즐 없음"); els.history.appendChild(option); els.history.disabled = true; return;
    }
    els.history.disabled = false;
    for (i = 0; i < index.length; i++) {
      record = getRecord(index[i]); if (!record) continue;
      option = document.createElement("option"); option.value = record.id; text(option, recordLabel(record));
      if (state.record && record.id === state.record.id) option.selected = true;
      els.history.appendChild(option);
    }
  }

  function selectedClueContains(cellKey, clue) { var i; if (!clue) return false; for (i = 0; i < clue.cells.length; i++) if (clue.cells[i] === cellKey) return true; return false; }

  function renderGrid() {
    var tbody = els.gridBody, r, c, cell, td, button, number, letter, rowEl;
    var clue = currentClue(), clueCorrect = clue ? Core.isClueCorrect(state.puzzle, state.progress, clue) : false;
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    if (!state.puzzle) return;
    for (r = 0; r < state.puzzle.gridSize; r++) {
      rowEl = document.createElement("tr");
      for (c = 0; c < state.puzzle.gridSize; c++) {
        cell = state.puzzle.grid[r][c]; td = document.createElement("td"); td.className = cell.occupied ? "cell" : "cell block";
        button = document.createElement("button"); button.type = "button"; button.setAttribute("aria-label", cell.occupied ? ("행 " + (r + 1) + " 열 " + (c + 1)) : "막힌 칸");
        if (!cell.occupied) button.disabled = true;
        else {
          if (cell.key === state.progress.selectedKey) td.className += " active";
          if (clueCorrect && selectedClueContains(cell.key, clue)) td.className += " correct";
          if (cell.number) { number = document.createElement("span"); number.className = "cell-number"; text(number, cell.number); button.appendChild(number); }
          letter = document.createElement("span"); letter.className = "cell-letter"; text(letter, Core.cellValue(state.progress, cell.key)); button.appendChild(letter);
          (function (key) { button.onclick = function () { selectCell(key, true); }; }(cell.key));
        }
        td.appendChild(button); rowEl.appendChild(td);
      }
      tbody.appendChild(rowEl);
    }
    sizeGridCells();
  }

  function sizeGridCells() {
    var viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    var viewportHeight = window.innerHeight || 800;
    var fixedHeight, size, buttons, cells, i;
    if (!viewportWidth || !els.grid || !els.clueCard || !els.answerCard) return;
    fixedHeight = els.appHeading.offsetHeight + els.clueCard.offsetHeight + els.answerCard.offsetHeight + els.status.offsetHeight + 38;
    size = Math.floor(Math.min((viewportWidth - 24) / 10, (viewportHeight - fixedHeight) / 10));
    if (size < 20) size = 20;
    if (size > 52) size = 52;
    els.grid.style.width = (size * 10 + 6) + "px";
    els.grid.style.height = (size * 10 + 6) + "px";
    buttons = els.grid.getElementsByTagName("button");
    for (i = 0; i < buttons.length; i++) { buttons[i].style.width = size + "px"; buttons[i].style.height = size + "px"; }
    cells = els.grid.getElementsByTagName("td");
    for (i = 0; i < cells.length; i++) { cells[i].style.width = size + "px"; cells[i].style.height = size + "px"; }
  }
  function safeArticle(url) { return /^https?:\/\//i.test(url || "") ? url : ""; }

  function renderClue() {
    var clue = currentClue(), cell = currentCell(), article;
    if (!clue || !cell) { text(els.clueLabel, "단서"); text(els.clueText, "퍼즐을 불러오는 중입니다."); text(els.definition, ""); els.articleLink.style.display = "none"; els.cellInput.value = ""; return; }
    text(els.clueLabel, Core.clueLabel(clue)); text(els.clueText, clue.clue || "단서 없음"); text(els.definition, clue.definition ? "정의: " + clue.definition : "");
    article = safeArticle(clue.articleUrl);
    if (article) { els.articleLink.href = article; els.articleLink.style.display = "inline-block"; text(els.articleLink, "관련 기사에서 힌트 찾기"); }
    else { els.articleLink.removeAttribute("href"); els.articleLink.style.display = "none"; }
    els.cellInput.value = Core.cellValue(state.progress, cell.key);
    text(els.direction, state.progress.direction === "across" ? "가로" : "세로");
  }
  function renderAll() { renderHistory(); renderGrid(); renderClue(); sizeGridCells(); }

  function focusInput() { window.setTimeout(function () { try { els.cellInput.focus(); els.cellInput.setSelectionRange(0, els.cellInput.value.length); } catch (e) {} sizeGridCells(); }, 0); window.setTimeout(sizeGridCells, 180); }

  function selectCell(key, toggleDirection) {
    var cell, clue;
    if (!state.puzzle || !state.progress) return;
    cell = Core.getCell(state.puzzle, key); if (!cell || !cell.occupied) return;
    if (toggleDirection && key === state.progress.selectedKey && cell.across && cell.down) state.progress.direction = state.progress.direction === "across" ? "down" : "across";
    else if (state.progress.direction === "across" && !cell.across && cell.down) state.progress.direction = "down";
    else if (state.progress.direction === "down" && !cell.down && cell.across) state.progress.direction = "across";
    state.progress.selectedKey = key; clue = currentClue(); if (clue) state.progress.direction = clue.direction;
    saveProgress(); renderAll(); focusInput();
  }

  function moveCell(delta, focus) {
    var clue = currentClue(), next; if (!clue) return;
    next = Core.nextCellKey(clue, state.progress.selectedKey, delta); state.progress.selectedKey = next; saveProgress(); renderAll(); if (focus) focusInput();
  }
  function isPartialHangul(value) {
    return !!value && !/[\uAC00-\uD7A3]/.test(value) && /[\u1100-\u11FF\u3131-\u318E\uA960-\uA97F\uD7B0-\uD7FF]/.test(value);
  }
  function commitInput(advance) {
    var key, value; if (!state.puzzle || !state.progress) return;
    key = state.progress.selectedKey; value = els.cellInput.value.replace(/\s/g, ""); Core.setCell(state.puzzle, state.progress, key, value); saveProgress();
    if (advance && value && !isPartialHangul(value)) moveCell(1, true); else { renderGrid(); renderClue(); }
  }
  function clearCell() { if (!state.puzzle || !state.progress) return; Core.setCell(state.puzzle, state.progress, state.progress.selectedKey, ""); saveProgress(); renderAll(); focusInput(); }
  function checkCurrentClue() {
    var clue = currentClue(); if (!clue) return;
    if (!Core.isClueComplete(state.puzzle, state.progress, clue)) { setStatus(Core.clueLabel(clue) + "의 빈 칸을 먼저 채우세요.", true); return; }
    if (Core.isClueCorrect(state.puzzle, state.progress, clue)) setStatus(Core.clueLabel(clue) + " 정답입니다.", false);
    else setStatus(Core.clueLabel(clue) + "이 아직 맞지 않습니다.", true);
    renderGrid();
  }
  function toggleDirection() {
    var cell = currentCell(); if (!cell) return;
    if (!(cell.across && cell.down)) { setStatus("이 칸에서는 방향을 바꿀 수 없습니다.", true); return; }
    state.progress.direction = state.progress.direction === "across" ? "down" : "across"; saveProgress(); renderAll(); focusInput();
  }

  function loadRecord(record, message) {
    var puzzle, saved;
    try { puzzle = Core.buildPuzzle(record.raw); saved = readJson(PROGRESS_PREFIX + puzzle.id, null); state.puzzle = puzzle; state.record = record; state.progress = Core.normalizeProgress(puzzle, saved); renderAll(); setStatus(message || "저장된 퍼즐을 열었습니다.", false); }
    catch (e) { setStatus(e.message || "퍼즐을 열지 못했습니다.", true); }
  }
  function loadLatestCached(message) {
    var index = readIndex(), record = index.length ? getRecord(index[0]) : null;
    if (record) loadRecord(record, message || "저장된 최신 퍼즐을 열었습니다.");
    else { renderHistory(); setStatus("저장된 퍼즐이 없습니다. Wi-Fi를 연결하고 새로고침하세요.", true); }
  }

  function requestLatest() {
    var xhr = new XMLHttpRequest(); setStatus("한국일보 최신 퍼즐을 확인하는 중입니다.", false); xhr.open("GET", ENDPOINT, true); xhr.timeout = 15000;
    xhr.onreadystatechange = function () {
      var raw, puzzle, record, fetchedAt; if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try { raw = JSON.parse(xhr.responseText); puzzle = Core.buildPuzzle(raw); fetchedAt = nowIso(); record = savePuzzle(raw, puzzle, fetchedAt); loadRecord(record, "한국일보 최신 퍼즐을 확인했습니다."); }
        catch (e) { loadLatestCached("새 퍼즐 해석에 실패해 저장된 퍼즐을 열었습니다."); }
      } else loadLatestCached("네트워크에 연결하지 못해 저장된 퍼즐을 열었습니다.");
    };
    xhr.ontimeout = function () { loadLatestCached("다운로드 시간이 초과되어 저장된 퍼즐을 열었습니다."); };
    xhr.onerror = function () { loadLatestCached("네트워크 오류로 저장된 퍼즐을 열었습니다."); };
    try { xhr.send(null); } catch (e) { loadLatestCached("네트워크 오류로 저장된 퍼즐을 열었습니다."); }
  }
  function chooseHistory() { var record = getRecord(els.history.value); if (record) loadRecord(record, "저장된 퍼즐을 열었습니다."); }

  function bind() {
    els.grid = byId("grid"); els.gridBody = byId("grid-body"); els.history = byId("history"); els.reload = byId("reload"); els.clueLabel = byId("clue-label"); els.clueText = byId("clue-text");
    els.definition = byId("definition"); els.articleLink = byId("article-link"); els.cellInput = byId("cell-input"); els.status = byId("status"); els.direction = byId("direction"); els.appHeading = document.getElementsByClassName("app-heading")[0]; els.clueCard = document.getElementsByClassName("clue-card")[0]; els.answerCard = document.getElementsByClassName("answer-card")[0];
    byId("check").onclick = checkCurrentClue; byId("clear").onclick = clearCell; byId("previous").onclick = function () { moveCell(-1, true); }; byId("next").onclick = function () { moveCell(1, true); };
    els.direction.onclick = toggleDirection; els.reload.onclick = requestLatest; els.history.onchange = chooseHistory;
    els.cellInput.oncompositionstart = function () { state.composing = true; };
    els.cellInput.oncompositionend = function () { state.composing = false; window.setTimeout(function () { commitInput(true); }, 0); };
    els.cellInput.oninput = function () { if (!state.composing) commitInput(!isPartialHangul(els.cellInput.value.replace(/\s/g, ""))); };
    window.onresize = sizeGridCells; window.onorientationchange = sizeGridCells;
  }
  function start() { if (!Core) return; bind(); migrateLegacyCache(); loadLatestCached("저장된 퍼즐을 먼저 열었습니다. 최신 퍼즐을 확인합니다."); requestLatest(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
}());
