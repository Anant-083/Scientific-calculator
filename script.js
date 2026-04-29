'use strict';

// ── State ──────────────────────────────────────────────────────────────────
let expr        = '';
let ans         = 0;
let memory      = 0;
let cursorPos   = 0;
let shiftOn     = false;
let alphaOn     = false;
let angleMode   = 'DEG';   // 'DEG' | 'RAD' | 'GRA'
let history     = [];
let historyIdx  = -1;
let justEvaled  = false;   // after = pressed, next number starts fresh

const exprLine   = document.getElementById('expr-line');
const resultLine = document.getElementById('result-line');
const display    = document.querySelector('.display');

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
  // Live preview while typing
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
  // If just evaluated and user types a digit/function, clear and start fresh
  if (justEvaled && /^[\d(]/.test(val)) {
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

// Shift-aware insert: if shift on → shiftVal, else normalVal
function shiftOrNormal(shiftVal, normalVal) {
  justEvaled = false;
  if (shiftOn) {
    if (shiftVal === 'insert_e') { insert('e'); }
    else { insert(shiftVal); }
    clearShift();
  } else {
    if (normalVal === 'insert_pi') { insert('π'); }
    else { insert(normalVal); }
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
  display.classList.remove('error');
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

// ── Special keys ──────────────────────────────────────────────────────────
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
  // M+ : add result to memory and show M indicator
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
  document.querySelector('.calculator').classList.toggle('shift-active', shiftOn);
}

function clearShift() {
  shiftOn = false;
  setInd('ind-shift', false);
  document.querySelector('.calculator').classList.remove('shift-active');
}

function pressAlpha() {
  alphaOn = !alphaOn;
  shiftOn = false;
  setInd('ind-alpha', alphaOn);
  setInd('ind-shift', false);
  document.querySelector('.calculator').classList.remove('shift-active');
}

function pressMode() {
  // MODE just cycles angle for now
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

function setInd(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', on);
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

  // Display symbols → JS
  e = e.replace(/÷/g, '/');
  e = e.replace(/×/g, '*');
  e = e.replace(/−/g, '-');
  e = e.replace(/π/g, 'Math.PI');

  // Scientific notation: ×10^
  e = e.replace(/\*10\^(-?\d+(\.\d+)?)/g, '*Math.pow(10,$1)');

  // Standalone e → Euler
  e = e.replace(/\be\b/g, 'Math.E');

  // Percentage
  e = e.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

  // Factorial
  e = e.replace(/fact\(([^)]+)\)/g, (_,n) => `_fact(${n})`);

  // pow10(x) = 10^x
  e = e.replace(/pow10\(([^)]+)\)/g, 'Math.pow(10,$1)');

  // exp(x) = e^x
  e = e.replace(/\bexp\(/g, 'Math.exp(');

  // sq(x) = x²
  e = e.replace(/sq\(([^)]+)\)/g, 'Math.pow($1,2)');

  // inv(x) = 1/x
  e = e.replace(/inv\(([^)]+)\)/g, '(1/($1))');

  // cbrt
  e = e.replace(/\bcbrt\(/g, 'Math.cbrt(');

  // pow(x,y)
  e = e.replace(/\bpow\(/g, 'Math.pow(');

  // log10 / ln
  e = e.replace(/\blog10\(/g, 'Math.log10(');
  e = e.replace(/\bln\(/g, 'Math.log(');

  // sqrt
  e = e.replace(/\bsqrt\(/g, 'Math.sqrt(');

  // Trig: inverse first (avoid re-matching)
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

  const helpers = `
    const toRad  = ${toRad.toString()};
    const fromRad = ${fromRad.toString()};
    const _sin  = x => Math.sin(toRad(x));
    const _cos  = x => Math.cos(toRad(x));
    const _tan  = x => Math.tan(toRad(x));
    const _asin = x => fromRad(Math.asin(x));
    const _acos = x => fromRad(Math.acos(x));
    const _atan = x => fromRad(Math.atan(x));
    const _fact = n => { n = Math.round(n); if(n<0||n>170) return Infinity; let r=1; for(let i=2;i<=n;i++)r*=i; return r; };
  `;

  const result = Function('"use strict";' + helpers + 'return (' + e + ')')();

  if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) return null;
  return result;
}

// ── Equals ─────────────────────────────────────────────────────────────────
function pressEquals() {
  if (!expr.trim()) return;

  try {
    const result = evaluate(expr);

    if (result === null) {
      showError('Math ERROR');
      return;
    }

    ans = result;
    history.push(expr);
    historyIdx = -1;

    const display_str = formatResult(result);
    exprLine.textContent = expr;
    resultLine.textContent = display_str;
    expr = display_str;
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
  display.classList.add('error');
  setTimeout(() => {
    resultLine.style.color = '';
    display.classList.remove('error');
  }, 1200);
}

// ── Keyboard Support ───────────────────────────────────────────────────────
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
  else if (e.key === '^') insert('^');
  else if (e.key === 'Enter') pressEquals();
  else if (e.key === 'Backspace') pressDel();
  else if (e.key === 'Escape') pressAC();
  else if (e.key === 'ArrowLeft')  moveCursor(-1);
  else if (e.key === 'ArrowRight') moveCursor(1);
  else if (e.key === 'ArrowUp') pressUp();
});

// ── Init ───────────────────────────────────────────────────────────────────
setInd('ind-deg', true);
