'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let expr       = '';
let ans        = 0;
let memory     = 0;
let cursorPos  = 0;
let shiftOn    = false;
let alphaOn    = false;
let angleMode  = 'DEG';
let history    = [];
let historyIdx = -1;
let justEvaled = false;

const exprLine   = document.getElementById('expr-line');
const resultLine = document.getElementById('result-line');
const displayEl  = document.querySelector('.display');

// ── Indicators ─────────────────────────────────────────────────────────────
function setInd(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', on);
}

// ── Display ────────────────────────────────────────────────────────────────
function updateDisplay() {
  if (expr === '') {
    exprLine.innerHTML = '';
    resultLine.textContent = '0';
    return;
  }
  const before = escHtml(expr.slice(0, cursorPos));
  const after  = escHtml(expr.slice(cursorPos));
  exprLine.innerHTML = before + '<span class="cursor">|</span>' + after;

  // Live preview
  try {
    const preview = evaluate(expr);
    if (preview !== null && expr.length > 1) {
      resultLine.textContent = formatResult(preview);
    }
  } catch (_) {}
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Insert / Delete ────────────────────────────────────────────────────────
function insert(val) {
  if (justEvaled && /^[\d.(]/.test(val)) {
    expr = '';
    cursorPos = 0;
  }
  justEvaled = false;
  expr = expr.slice(0, cursorPos) + val + expr.slice(cursorPos);
  cursorPos += val.length;
  updateDisplay();
}

function insertFunc(func) {
  justEvaled = false;
  insert(func);
}

function insertTrig(func) {
  justEvaled = false;
  if (shiftOn) {
    insert('a' + func + '(');
    clearShift();
  } else {
    insert(func + '(');
  }
}

function shiftOrNormal(shiftVal, normalVal) {
  justEvaled = false;
  if (shiftOn) {
    if (shiftVal === 'insert_e') {
      insert('e');
    } else {
      insert(shiftVal);
    }
    clearShift();
  } else {
    if (normalVal === 'insert_pi') {
      insert('π');
    } else {
      insert(normalVal);
    }
  }
}

function pressDel() {
  justEvaled = false;
  if (cursorPos > 0) {
    expr = expr.slice(0, cursorPos - 1) + expr.slice(cursorPos);
    cursorPos--;
    updateDisplay();
  }
}

function pressAC() {
  expr = '';
  cursorPos = 0;
  justEvaled = false;
  exprLine.innerHTML = '';
  resultLine.textContent = '0';
  displayEl.classList.remove('error');
}

// ── Cursor / History ───────────────────────────────────────────────────────
function moveCursor(dir) {
  cursorPos = Math.max(0, Math.min(expr.length, cursorPos + dir));
  updateDisplay();
}

function pressUp() {
  if (!history.length) return;
  if (historyIdx === -1) historyIdx = history.length - 1;
  else if (historyIdx > 0) historyIdx--;
  expr = history[historyIdx];
  cursorPos = expr.length;
  justEvaled = false;
  updateDisplay();
}

// ── Special Keys ───────────────────────────────────────────────────────────
function pressAns() {
  insert(formatResult(ans));
}

function pressNegate() {
  justEvaled = false;
  if (expr === '' || expr === '0') { insert('-'); return; }
  if (expr.startsWith('-')) {
    expr = expr.slice(1);
    cursorPos = Math.max(0, cursorPos - 1);
  } else {
    expr = '-' + expr;
    cursorPos++;
  }
  updateDisplay();
}

function pressMemory() {
  try {
    const val = evaluate(expr);
    if (val !== null) {
      memory += val;
      setInd('ind-m', true);
    }
  } catch(_) {}
}

// ── SHIFT / ALPHA / MODE ───────────────────────────────────────────────────
function pressShift() {
  shiftOn = !shiftOn;
  alphaOn = false;
  setInd('ind-shift', shiftOn);
  setInd('ind-alpha', false);
  document.querySelectorAll('.top-label').forEach(el => {
    el.style.color      = shiftOn ? '#ffe040' : '#e8a000';
    el.style.fontWeight = shiftOn ? 'bold'    : 'normal';
  });
}

function clearShift() {
  shiftOn = false;
  setInd('ind-shift', false);
  document.querySelectorAll('.top-label').forEach(el => {
    el.style.color      = '#e8a000';
    el.style.fontWeight = 'normal';
  });
}

function pressAlpha() {
  alphaOn = !alphaOn;
  shiftOn = false;
  setInd('ind-alpha', alphaOn);
  setInd('ind-shift', false);
  clearShift();
}

function pressMode() {
  cycleAngleMode();
}

function cycleAngleMode() {
  if (angleMode === 'DEG') {
    angleMode = 'RAD';
    setInd('ind-deg', false);
    setInd('ind-rad', true);
    setInd('ind-gra', false);
  } else if (angleMode === 'RAD') {
    angleMode = 'GRA';
    setInd('ind-deg', false);
    setInd('ind-rad', false);
    setInd('ind-gra', true);
  } else {
    angleMode = 'DEG';
    setInd('ind-deg', true);
    setInd('ind-rad', false);
    setInd('ind-gra', false);
  }
}

// ── Core Evaluator ─────────────────────────────────────────────────────────
function toRad(val) {
  if (angleMode === 'DEG') return val * Math.PI / 180;
  if (angleMode === 'GRA') return val * Math.PI / 200;
  return val;
}

function fromRad(val) {
  if (angleMode === 'DEG') return val * 180 / Math.PI;
  if (angleMode === 'GRA') return val * 200 / Math.PI;
  return val;
}

function evaluate(raw) {
  let e = raw;

  e = e.replace(/÷/g, '/');
  e = e.replace(/×/g, '*');
  e = e.replace(/−/g, '-');
  e = e.replace(/π/g, 'Math.PI');

  // Scientific notation ×10^
  e = e.replace(/\*10\^(-?\d+(\.\d+)?)/g, '*Math.pow(10,$1)');

  // Standalone e → Euler's number
  e = e.replace(/\be\b/g, 'Math.E');

  // Percentage
  e = e.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

  // Special functions
  e = e.replace(/fact\(([^)]+)\)/g,  '(_fact($1))');
  e = e.replace(/pow10\(([^)]+)\)/g, 'Math.pow(10,$1)');
  e = e.replace(/\bexp\(/g,          'Math.exp(');
  e = e.replace(/sq\(([^)]+)\)/g,    'Math.pow($1,2)');
  e = e.replace(/inv\(([^)]+)\)/g,   '(1/($1))');
  e = e.replace(/\bcbrt\(/g,         'Math.cbrt(');
  e = e.replace(/\bpow\(/g,          'Math.pow(');
  e = e.replace(/\blog10\(/g,        'Math.log10(');
  e = e.replace(/\bln\(/g,           'Math.log(');
  e = e.replace(/\bsqrt\(/g,         'Math.sqrt(');

  // Trig — inverse before forward to avoid double-matching
  if (angleMode !== 'RAD') {
    e = e.replace(/\basin\(/g, '_asin(');
    e = e.replace(/\bacos\(/g, '_acos(');
    e = e.replace(/\batan\(/g, '_atan(');
    e = e.replace(/\bsin\(/g,  '_sin(');
    e = e.replace(/\bcos\(/g,  '_cos(');
    e = e.replace(/\btan\(/g,  '_tan(');
  } else {
    e = e.replace(/\basin\(/g, 'Math.asin(');
    e = e.replace(/\bacos\(/g, 'Math.acos(');
    e = e.replace(/\batan\(/g, 'Math.atan(');
    e = e.replace(/\bsin\(/g,  'Math.sin(');
    e = e.replace(/\bcos\(/g,  'Math.cos(');
    e = e.replace(/\btan\(/g,  'Math.tan(');
  }

  const code = `
    "use strict";
    const toRad   = ${toRad.toString()};
    const fromRad = ${fromRad.toString()};
    const _sin  = x => Math.sin(toRad(x));
    const _cos  = x => Math.cos(toRad(x));
    const _tan  = x => Math.tan(toRad(x));
    const _asin = x => fromRad(Math.asin(x));
    const _acos = x => fromRad(Math.acos(x));
    const _atan = x => fromRad(Math.atan(x));
    const _fact = n => {
      n = Math.round(n);
      if (n < 0 || n > 170) return Infinity;
      let r = 1;
      for (let i = 2; i <= n; i++) r *= i;
      return r;
    };
    return (${e});
  `;

  const result = Function(code)();
  if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) return null;
  return result;
}

// ── Equals ─────────────────────────────────────────────────────────────────
function pressEquals() {
  if (!expr.trim()) return;
  try {
    const result = evaluate(expr);
    if (result === null) { showError('Math ERROR'); return; }

    ans = result;
    history.push(expr);
    historyIdx = -1;

    const str = formatResult(result);
    exprLine.textContent    = expr;
    resultLine.textContent  = str;
    expr      = str;
    cursorPos = expr.length;
    justEvaled = true;

  } catch (err) {
    showError('Syntax ERROR');
  }
}

// ── Formatting ─────────────────────────────────────────────────────────────
function formatResult(n) {
  if (Number.isInteger(n) && Math.abs(n) < 1e13) return n.toString();
  if (Math.abs(n) >= 1e10 || (Math.abs(n) < 1e-4 && n !== 0)) {
    return n.toExponential(6).replace(/e\+?(-?)0*(\d+)/, 'e$1$2');
  }
  return parseFloat(n.toPrecision(10)).toString();
}

// ── Error ──────────────────────────────────────────────────────────────────
function showError(msg) {
  resultLine.textContent = msg;
  resultLine.style.color = '#8a1a00';
  displayEl.classList.add('error');
  setTimeout(() => {
    resultLine.style.color = '';
    displayEl.classList.remove('error');
  }, 1200);
}

// ── Keyboard ───────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key >= '0' && e.key <= '9') insert(e.key);
  else if (e.key === '+') insert('+');
  else if (e.key === '-') insert('−');
  else if (e.key === '*') insert('×');
  else if (e.key === '/') { e.preventDefault(); insert('÷'); }
  else if (e.key === '.') insert('.');
  else if (e.key === '(') insert('(');
  else if (e.key === ')') insert(')');
  else if (e.key === '%') insert('%');
  else if (e.key === 'Enter') pressEquals();
  else if (e.key === 'Backspace') pressDel();
  else if (e.key === 'Escape') pressAC();
  else if (e.key === 'ArrowLeft')  moveCursor(-1);
  else if (e.key === 'ArrowRight') moveCursor(1);
  else if (e.key === 'ArrowUp') pressUp();
});

// ── Init ───────────────────────────────────────────────────────────────────
setInd('ind-deg', true);
