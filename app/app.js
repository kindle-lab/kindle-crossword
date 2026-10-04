(function () {
  "use strict";

  var ENDPOINT = "https://d3owq5b4yti859.cloudfront.net/puzzle.json";
  var CACHE_PREFIX = "crossword:puzzle:";
  var GRID_SIZE = 10;
  var state = { puzzle: null, date: null, selected: null, direction: "across", entries: {} };
  var els = {};

  function byId(id) { return document.getElementById(id); }
  function own(obj, key) { return Object.prototype.hasOwnProperty.call(obj, key); }
  function today() {
    var d = new Date();
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function setStatus(message, error) {
    els.status.innerHTML = message || "";
    els.status.className = error ? "status error" : "status";
  }
  function utf8(binary) {
    var encoded = "", i;
    for (i = 0; i < binary.length; i++) encoded += "%" + ("0" + binary.charCodeAt(i).toString(16)).slice(-2);
    try { return decodeURIComponent(encoded); } catch (e) { return binary; }
  }
  function base64UrlDecode(value) {
    var normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    return utf8(window.atob(normalized));
  }
  function unwrapResponse(data) {
    var token, middle, decoded;
    if (data && data.encode_data) {
      token = String(data.encode_data).split(".");
      middle = token.length > 1 ? token[1] : token[0];
      decoded = base64UrlDecode(middle);
      return JSON.parse(decoded);
    }
    if (data && typeof data.body === "string") {
      data.body = JSON.parse(data.body);
    }
    return data;
  }
  function section(body, direction, clues, grid) {
    var source = body[direction] || {}, keys = [], i, key, raw, answer, clue, n, row, col, cell;
    for (key in source) if (own(source, key)) keys.push(key);
    keys.sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
    for (i = 0; i < keys.length; i++) {
      key = keys[i]; raw = source[key] || {};
      answer = String(raw.answer || "").replace(/\s/g, "");
      clue = { number: parseInt(key, 10), direction: direction, answer: answer,
        row: parseInt(raw.row, 10), col: parseInt(raw.col, 10),
        clue: String(raw.clue || ""), definition: String(raw.definition || ""),
        articleUrl: String(raw.articleUrl || "") };
      if (!answer || isNaN(clue.row) || isNaN(clue.col)) throw new Error("clue data is incomplete");
      for (n = 0; n < answer.length; n++) {
        row = clue.row + (direction === "down" ? n : 0);
        col = clue.col + (direction === "across" ? n : 0);
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) throw new Error("clue leaves 10x10 grid");
        cell = grid[row][col];
        if (cell.letter && cell.letter !== answer.charAt(n)) throw new Error("crossing answers conflict");
        cell.letter = answer.charAt(n); cell.occupied = true;
        if (direction === "across") cell.across = clue; else cell.down = clue;
      }
      clues.push(clue);
    }
  }
  function buildPuzzle(raw) {
    var data = unwrapResponse(raw), body = data && data.body, grid = [], clues = [], r, c;
    if (!data || (data.statusCode && Number(data.statusCode) !== 200) || !body) throw new Error("퍼즐 응답이 올바르지 않습니다.");
    if (typeof body === "string") body = JSON.parse(body);
    for (r = 0; r < GRID_SIZE; r++) { grid[r] = []; for (c = 0; c < GRID_SIZE; c++) grid[r][c] = { occupied: false, letter: "", across: null, down: null }; }
    section(body, "across", clues, grid); section(body, "down", clues, grid);
    if (!clues.length) throw new Error("퍼즐 단서가 없습니다.");
    return { body: body, grid: grid, clues: clues };
  }
  function cacheKey(date) { return CACHE_PREFIX + date; }
  function saveCached(date, raw) {
    try { localStorage.setItem(cacheKey(date), JSON.stringify({ savedAt: new Date().toISOString(), raw: raw })); } catch (e) {}
  }
  function readCached(date) {
    var item;
    try { item = localStorage.getItem(cacheKey(date)); return item ? JSON.parse(item).raw : null; } catch (e) { return null; }
  }
  function cachedDates() {
    var dates = [], i, key;
    try {
      for (i = 0; i < localStorage.length; i++) { key = localStorage.key(i); if (key.indexOf(CACHE_PREFIX) === 0) dates.push(key.slice(CACHE_PREFIX.length)); }
    } catch (e) {}
    dates.sort().reverse(); return dates;
  }
  function saveEntries() {
    if (!state.date) return;
    try { localStorage.setItem(CACHE_PREFIX + state.date + ":answers", JSON.stringify(state.entries)); } catch (e) {}
  }
  function loadEntries() {
    try { state.entries = JSON.parse(localStorage.getItem(CACHE_PREFIX + state.date + ":answers") || "{}"); } catch (e) { state.entries = {}; }
    if (state.puzzle) {
      var i, clue, value, n, cell;
      for (i = 0; i < state.puzzle.clues.length; i++) {
        clue = state.puzzle.clues[i]; value = fillFor(clue);
        for (n = 0; n < value.length; n++) {
          cell = state.puzzle.grid[clue.row + (clue.direction === "down" ? n : 0)][clue.col + (clue.direction === "across" ? n : 0)];
          cell.answer = value.charAt(n);
        }
      }
    }
  }
  function fillFor(clue) { return state.entries[clue.direction + ":" + clue.number] || ""; }
  function storeFor(clue, value) { state.entries[clue.direction + ":" + clue.number] = value; }
  function clueLabel(clue) { return (clue.direction === "across" ? "가로 " : "세로 ") + clue.number; }
  function renderHistory() {
    var dates = cachedDates(), selected = state.date, i, option;
    els.history.innerHTML = "";
    if (!dates.length && selected) dates = [selected];
    for (i = 0; i < dates.length; i++) { option = document.createElement("option"); option.value = dates[i]; option.innerHTML = dates[i]; if (dates[i] === selected) option.selected = true; els.history.appendChild(option); }
  }
  function renderGrid() {
    var r, c, cell, button, number, letter, clue, isActive;
    els.grid.innerHTML = "";
    for (r = 0; r < GRID_SIZE; r++) for (c = 0; c < GRID_SIZE; c++) {
      cell = state.puzzle.grid[r][c]; button = document.createElement("button"); button.type = "button"; button.className = "cell";
      button.setAttribute("role", "gridcell");
      if (!cell.occupied) { button.className += " block"; button.disabled = true; }
      else {
        number = cell.across ? cell.across.number : (cell.down ? cell.down.number : "");
        if (number) { var num = document.createElement("span"); num.className = "cell-number"; num.innerHTML = number; button.appendChild(num); }
        letter = document.createElement("span"); letter.className = "cell-letter";
        letter.innerHTML = (cell.answer || ""); button.appendChild(letter);
        clue = cell[state.direction] || cell.across || cell.down;
        isActive = state.selected && (clue === state.selected) ;
        if (isActive) button.className += " active";
        if ((cell.across && cell.across.correct) || (cell.down && cell.down.correct)) button.className += " correct";
        (function (selectedCell) { button.onclick = function () { selectCell(selectedCell); }; }(cell));
      }
      els.grid.appendChild(button);
    }
  }
  function renderClue() {
    var clue = state.selected;
    if (!clue) { els.clueLabel.innerHTML = "단서"; els.clueText.innerHTML = "격자에서 칸을 선택하세요."; els.definition.innerHTML = ""; els.answerInput.value = ""; return; }
    els.clueLabel.innerHTML = clueLabel(clue);
    els.clueText.innerHTML = clue.clue || "단서 없음";
    els.definition.innerHTML = clue.definition ? "정의: " + clue.definition : "";
    els.answerInput.value = fillFor(clue);
  }
  function renderAll() { renderHistory(); renderGrid(); renderClue(); }
  function selectClue(clue) {
    if (!clue) return;
    state.selected = clue; renderAll();
    els.answerInput.focus();
    try { els.answerInput.setSelectionRange(els.answerInput.value.length, els.answerInput.value.length); } catch (e) {}
  }
  function selectCell(cell) {
    var clue = cell[state.direction] || cell.across || cell.down;
    if (state.selected && clue === state.selected && cell.across && cell.down) clue = state.direction === "across" ? cell.down : cell.across;
    if (clue && state.selected === clue && cell.across && cell.down) state.direction = state.direction === "across" ? "down" : "across";
    if (clue && state.selected !== clue) state.direction = clue.direction;
    selectClue(clue);
  }
  function applyAnswer() {
    var clue = state.selected, value, i, key;
    if (!clue) return;
    value = els.answerInput.value.replace(/\s/g, "").split("").slice(0, clue.answer.length).join("");
    storeFor(clue, value); saveEntries();
    for (i = 0; i < clue.answer.length; i++) {
      key = state.puzzle.grid[clue.row + (clue.direction === "down" ? i : 0)][clue.col + (clue.direction === "across" ? i : 0)];
      key.answer = value.charAt(i) || "";
    }
    renderGrid();
  }
  function checkAnswer() {
    var clue = state.selected, answer;
    if (!clue) return;
    applyAnswer(); answer = fillFor(clue);
    if (answer.length !== clue.answer.length) { setStatus("정답 길이를 모두 입력하세요.", true); return; }
    if (answer === clue.answer) { clue.correct = true; setStatus(clueLabel(clue) + " 정답입니다."); renderGrid(); }
    else { clue.correct = false; setStatus("다시 확인해 보세요.", true); }
  }
  function clearAnswer() { if (!state.selected) return; storeFor(state.selected, ""); saveEntries(); state.selected.correct = false; renderAll(); els.answerInput.focus(); }
  function move(delta) {
    var list = state.puzzle ? state.puzzle.clues : [], index = list.indexOf(state.selected), next;
    if (!list.length) return; next = list[(index + delta + list.length) % list.length]; state.direction = next.direction; selectClue(next);
  }
  function loadRaw(date, raw, message) {
    try { state.puzzle = buildPuzzle(raw); state.date = date; loadEntries(); state.selected = state.puzzle.clues[0]; state.direction = state.selected.direction; renderAll(); setStatus(message || (date + " 퍼즐")); } catch (e) { setStatus(e.message || "퍼즐을 표시하지 못했습니다.", true); }
  }
  function requestLatest() {
    var xhr = new XMLHttpRequest(), date = today();
    setStatus("오늘 퍼즐을 내려받는 중입니다.");
    xhr.open("GET", ENDPOINT, true); xhr.timeout = 15000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try { var raw = JSON.parse(xhr.responseText); buildPuzzle(raw); saveCached(date, raw); loadRaw(date, raw, date + " 최신 퍼즐"); }
        catch (e) { loadCachedFallback(date, "최신 퍼즐 해석 실패: 저장된 퍼즐을 엽니다."); }
      } else loadCachedFallback(date, "네트워크에 연결하지 못해 저장된 퍼즐을 엽니다.");
    };
    xhr.ontimeout = function () { loadCachedFallback(date, "다운로드 시간이 초과되어 저장된 퍼즐을 엽니다."); };
    xhr.onerror = function () { loadCachedFallback(date, "네트워크 오류로 저장된 퍼즐을 엽니다."); };
    try { xhr.send(null); } catch (e) { loadCachedFallback(date, "네트워크 오류로 저장된 퍼즐을 엽니다."); }
  }
  function loadCachedFallback(preferredDate, message) {
    var dates = cachedDates(), date = readCached(preferredDate) ? preferredDate : dates[0], raw = date ? readCached(date) : null;
    if (raw) loadRaw(date, raw, message); else { els.history.innerHTML = "<option>저장된 퍼즐 없음</option>"; setStatus("저장된 퍼즐이 없습니다. 새로고침을 눌러 다시 시도하세요.", true); }
  }
  function chooseHistory() { var date = els.history.value, raw = readCached(date); if (raw) loadRaw(date, raw, date + " 저장 퍼즐"); }
  function bind() {
    els.grid = byId("grid"); els.history = byId("history"); els.reload = byId("reload"); els.clueLabel = byId("clue-label"); els.clueText = byId("clue-text"); els.definition = byId("definition"); els.answerInput = byId("answer-input"); els.status = byId("status");
    byId("check").onclick = checkAnswer; byId("clear").onclick = clearAnswer; byId("previous").onclick = function () { move(-1); }; byId("next").onclick = function () { move(1); }; els.reload.onclick = requestLatest; els.history.onchange = chooseHistory;
    els.answerInput.oninput = applyAnswer; els.answerInput.onkeyup = applyAnswer;
  }
  function start() { bind(); renderHistory(); requestLatest(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
}());
