Script · JS
Copy

let expr = '';
let ans = 0;
let cursorPos = 0;
let shiftOn = false;
let alphaOn = false;
let angleMode = 'DEG';
let history = [];
let historyIndex = -1;
 
const exprLine = document.getElementById('expr-line');
const resultLine = document.getElementById('result-line');
 
function updateDisplay() {
  if (expr === '') {
    exprLine.textContent = '';
    resultLine.textContent = '0';
    return;
  }
  const before = expr.slice(0, cursorPos);
  const after = expr.slice(cursorPos);
  exprLine.innerHTML = escapeHtml(before) + '<span class="cursor">|</span>' + escapeHtml(after);
  resultLine.textContent = expr;
}
 
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
 
function insert(val) {
  expr = expr.slice(0, cursorPos) + val + expr.slice(cursorPos);
  cursorPos += val.length;
  updateDisplay();
}
 
function insertFunc(func) {
  insert(func);
}
 
function insertTrig(func) {
  if (shiftOn) {
    insert('a' + func + '(');
    shiftOn = false;
    document.getElementById('ind-shift').style.opacity = '0.2';
  } else {
    insert(func + '(');
  }
}
 
function pressDel() {
  if (cursorPos > 0) {
    expr = expr.slice(0, cursorPos - 1) + expr.slice(cursorPos);
    cursorPos--;
    updateDisplay();
  }
}
 
function pressAC() {
  expr = '';
  cursorPos = 0;
  resultLine.textContent = '0';
  exprLine.textContent = '';
}
 
function moveCursor(dir) {
  cursorPos = Math.max(0, Math.min(expr.length, cursorPos + dir));
  updateDisplay();
}
 
function pressUp() {
  if (history.length === 0) return;
  if (historyIndex === -1) historyIndex = history.length - 1;
  else if (historyIndex > 0) historyIndex--;
  expr = history[historyIndex];
  cursorPos = expr.length;
  updateDisplay();
}
 
function pressAns() {
  insert(ans.toString());
}
 
function pressNegate() {
  if (expr === '' || expr === '0') {
    insert('-');
  } else {
    if (expr.startsWith('-')) {
      expr = expr.slice(1);
      cursorPos = Math.max(0, cursorPos - 1);
    } else {
      expr = '-' + expr;
      cursorPos++;
    }
    updateDisplay();
  }
}
 
function pressShift() {
  shiftOn = !shiftOn;
  alphaOn = false;
  document.getElementById('ind-shift').style.opacity = shiftOn ? '1' : '0.2';
  document.getElementById('ind-alpha').style.opacity = '0.2';
  updateShiftLabels();
}
 
function pressAlpha() {
  alphaOn = !alphaOn;
  shiftOn = false;
  document.getElementById('ind-alpha').style.opacity = alphaOn ? '1' : '0.2';
  document.getElementById('ind-shift').style.opacity = '0.2';
}
 
function updateShiftLabels() {
  // Visual feedback for shift mode - highlight top labels
  const topLabels = document.querySelectorAll('.top-label');
  topLabels.forEach(label => {
    label.style.color = shiftOn ? '#ffcc00' : '#f0a000';
    label.style.fontWeight = shiftOn ? 'bold' : 'normal';
  });
}
 
function pressMode() {
  toggleDegRad();
}
 
function toggleDegRad() {
  if (angleMode === 'DEG') {
    angleMode = 'RAD';
    document.getElementById('ind-deg').style.opacity = '0.2';
    document.getElementById('ind-rad').style.opacity = '1';
  } else {
    angleMode = 'DEG';
    document.getElementById('ind-deg').style.opacity = '1';
    document.getElementById('ind-rad').style.opacity = '0.2';
  }
}
 
function toRad(deg) {
  return deg * Math.PI / 180;
}
 
function pressEquals() {
  if (!expr) return;
 
  try {
    let evalExpr = expr;
 
    // Replace display symbols
    evalExpr = evalExpr.replace(/÷/g, '/');
    evalExpr = evalExpr.replace(/×/g, '*');
    evalExpr = evalExpr.replace(/−/g, '-');
    evalExpr = evalExpr.replace(/π/g, 'Math.PI');
 
    // Handle EXP notation — must close the bracket properly
    evalExpr = evalExpr.replace(/×10\^(\d+)/g, '*Math.pow(10,$1)');
    evalExpr = evalExpr.replace(/\*Math\.pow\(10,(\d+)\)([^)]*)/g, '*Math.pow(10,$1)');
 
    // Handle e (Euler's number) — only standalone e, not inside words
    evalExpr = evalExpr.replace(/\be\b/g, 'Math.E');
 
    // Handle percentage
    evalExpr = evalExpr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
 
    // sq(x) → Math.pow(x, 2)
    evalExpr = evalExpr.replace(/sq\(([^)]+)\)/g, 'Math.pow($1,2)');
 
    // pow(x,y) → Math.pow(x,y)  — already in right format just rename
    evalExpr = evalExpr.replace(/\bpow\(/g, 'Math.pow(');
 
    // log10
    evalExpr = evalExpr.replace(/\blog10\(/g, 'Math.log10(');
 
    // ln
    evalExpr = evalExpr.replace(/\bln\(/g, 'Math.log(');
 
    // sqrt
    evalExpr = evalExpr.replace(/\bsqrt\(/g, 'Math.sqrt(');
 
    // cbrt
    evalExpr = evalExpr.replace(/\bcbrt\(/g, 'Math.cbrt(');
 
    // Trig with angle mode
    if (angleMode === 'DEG') {
      // Inverse trig → convert output back to degrees
      evalExpr = evalExpr.replace(/\basin\(/g, '((180/Math.PI)*Math.asin(');
      evalExpr = evalExpr.replace(/\bacos\(/g, '((180/Math.PI)*Math.acos(');
      evalExpr = evalExpr.replace(/\batan\(/g, '((180/Math.PI)*Math.atan(');
      // Forward trig → convert input to radians
      evalExpr = evalExpr.replace(/\bsin\(/g, 'Math.sin(toRad(');
      evalExpr = evalExpr.replace(/\bcos\(/g, 'Math.cos(toRad(');
      evalExpr = evalExpr.replace(/\btan\(/g, 'Math.tan(toRad(');
      // Close the extra bracket for forward trig
      evalExpr = evalExpr.replace(/Math\.sin\(toRad\(([^)]+)\)/g, 'Math.sin(toRad($1)))');
      evalExpr = evalExpr.replace(/Math\.cos\(toRad\(([^)]+)\)/g, 'Math.cos(toRad($1)))');
      evalExpr = evalExpr.replace(/Math\.tan\(toRad\(([^)]+)\)/g, 'Math.tan(toRad($1)))');
      // Close inverse trig bracket
      evalExpr = evalExpr.replace(/\(180\/Math\.PI\)\*Math\.asin\(([^)]+)\)/g, '((180/Math.PI)*Math.asin($1))');
      evalExpr = evalExpr.replace(/\(180\/Math\.PI\)\*Math\.acos\(([^)]+)\)/g, '((180/Math.PI)*Math.acos($1))');
      evalExpr = evalExpr.replace(/\(180\/Math\.PI\)\*Math\.atan\(([^)]+)\)/g, '((180/Math.PI)*Math.atan($1))');
    } else {
      evalExpr = evalExpr.replace(/\basin\(/g, 'Math.asin(');
      evalExpr = evalExpr.replace(/\bacos\(/g, 'Math.acos(');
      evalExpr = evalExpr.replace(/\batan\(/g, 'Math.atan(');
      evalExpr = evalExpr.replace(/\bsin\(/g, 'Math.sin(');
      evalExpr = evalExpr.replace(/\bcos\(/g, 'Math.cos(');
      evalExpr = evalExpr.replace(/\btan\(/g, 'Math.tan(');
    }
 
    let result = Function('"use strict"; const toRad = (d) => d * Math.PI / 180; return (' + evalExpr + ')')();
 
    if (typeof result !== 'number' || isNaN(result)) {
      resultLine.textContent = 'Math ERROR';
      showError();
      return;
    }
 
    if (!isFinite(result)) {
      resultLine.textContent = 'Math ERROR';
      showError();
      return;
    }
 
    ans = result;
    history.push(expr);
    historyIndex = -1;
 
    // Format result
    let display;
    if (Number.isInteger(result) && Math.abs(result) < 1e12) {
      display = result.toString();
    } else if (Math.abs(result) >= 1e10 || (Math.abs(result) < 1e-4 && result !== 0)) {
      display = result.toExponential(6);
    } else {
      display = parseFloat(result.toPrecision(10)).toString();
    }
 
    exprLine.textContent = expr;
    resultLine.textContent = display;
    expr = display;
    cursorPos = expr.length;
 
  } catch (e) {
    resultLine.textContent = 'Syntax ERROR';
    showError();
  }
}
 
function showError() {
  resultLine.style.color = '#cc0000';
  setTimeout(() => {
    resultLine.style.color = '';
  }, 1000);
}
 
// Keyboard support
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') insert(e.key);
  else if (e.key === '+') insert('+');
  else if (e.key === '-') insert('-');
  else if (e.key === '*') insert('×');
  else if (e.key === '/') { e.preventDefault(); insert('÷'); }
  else if (e.key === '.') insert('.');
  else if (e.key === '(') insert('(');
  else if (e.key === ')') insert(')');
  else if (e.key === '%') insert('%');
  else if (e.key === 'Enter') pressEquals();
  else if (e.key === 'Backspace') pressDel();
  else if (e.key === 'Escape') pressAC();
  else if (e.key === 'ArrowLeft') moveCursor(-1);
  else if (e.key === 'ArrowRight') moveCursor(1);
  else if (e.key === 'ArrowUp') pressUp();
});
 
// Init
document.getElementById('ind-deg').style.opacity = '1';
document.getElementById('ind-rad').style.opacity = '0.2';
document.getElementById('ind-shift').style.opacity = '0.2';
document.getElementById('ind-alpha').style.opacity = '0.2';
