let expr = '';
let ans = 0;
let cursorPos = 0;
let shiftOn = false;
let alphaOn = false;
let angleMode = 'DEG'; // DEG or RAD
let history = [];

const exprLine = document.getElementById('expr-line');
const resultLine = document.getElementById('result-line');

function updateDisplay() {
  const display = expr.slice(0, cursorPos) + '|' + expr.slice(cursorPos);
  exprLine.textContent = display.replace(/\|$/, '');
  resultLine.textContent = expr || '0';
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
    document.getElementById('ind-shift').classList.remove('active');
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
  if (history.length > 0) {
    expr = history[history.length - 1];
    cursorPos = expr.length;
    updateDisplay();
  }
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
  document.getElementById('ind-shift').style.opacity = shiftOn ? '1' : '0.2';
}

function pressAlpha() {
  alphaOn = !alphaOn;
  document.getElementById('ind-alpha').style.opacity = alphaOn ? '1' : '0.2';
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
    evalExpr = evalExpr.replace(/e(?!\^)/g, 'Math.E');

    // Handle percentage
    evalExpr = evalExpr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

    // Handle EXP notation
    evalExpr = evalExpr.replace(/×10\^/g, '*Math.pow(10,');

    // Trig with angle mode
    if (angleMode === 'DEG') {
      evalExpr = evalExpr.replace(/\bsin\(/g, 'Math.sin(toRad(');
      evalExpr = evalExpr.replace(/\bcos\(/g, 'Math.cos(toRad(');
      evalExpr = evalExpr.replace(/\btan\(/g, 'Math.tan(toRad(');
      evalExpr = evalExpr.replace(/\basin\(/g, '(180/Math.PI)*Math.asin(');
      evalExpr = evalExpr.replace(/\bacos\(/g, '(180/Math.PI)*Math.acos(');
      evalExpr = evalExpr.replace(/\batan\(/g, '(180/Math.PI)*Math.atan(');
      // Close extra brackets for deg trig
      evalExpr = evalExpr.replace(/Math\.sin\(toRad\(([^)]+)\)/g, 'Math.sin(toRad($1))');
      evalExpr = evalExpr.replace(/Math\.cos\(toRad\(([^)]+)\)/g, 'Math.cos(toRad($1))');
      evalExpr = evalExpr.replace(/Math\.tan\(toRad\(([^)]+)\)/g, 'Math.tan(toRad($1))');
    } else {
      evalExpr = evalExpr.replace(/\bsin\(/g, 'Math.sin(');
      evalExpr = evalExpr.replace(/\bcos\(/g, 'Math.cos(');
      evalExpr = evalExpr.replace(/\btan\(/g, 'Math.tan(');
      evalExpr = evalExpr.replace(/\basin\(/g, 'Math.asin(');
      evalExpr = evalExpr.replace(/\bacos\(/g, 'Math.acos(');
      evalExpr = evalExpr.replace(/\batan\(/g, 'Math.atan(');
    }

    // sq( → Math.pow( ,2)
    evalExpr = evalExpr.replace(/sq\(([^)]+)\)/g, 'Math.pow($1,2)');

    // pow( → Math.pow(
    evalExpr = evalExpr.replace(/pow\(/g, 'Math.pow(');

    // log10
    evalExpr = evalExpr.replace(/log10\(/g, 'Math.log10(');

    // ln
    evalExpr = evalExpr.replace(/\bln\(/g, 'Math.log(');

    // sqrt
    evalExpr = evalExpr.replace(/Math\.sqrt\(/g, 'Math.sqrt(');

    // cbrt
    evalExpr = evalExpr.replace(/cbrt\(/g, 'Math.cbrt(');

    let result = Function('"use strict"; const toRad = (d) => d * Math.PI / 180; return (' + evalExpr + ')')();

    if (typeof result !== 'number' || isNaN(result)) {
      resultLine.textContent = 'Math ERROR';
      return;
    }

    if (!isFinite(result)) {
      resultLine.textContent = 'Math ERROR';
      return;
    }

    ans = result;
    history.push(expr);

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
  }
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
  else if (e.key === 'Enter') pressEquals();
  else if (e.key === 'Backspace') pressDel();
  else if (e.key === 'Escape') pressAC();
  else if (e.key === 'ArrowLeft') moveCursor(-1);
  else if (e.key === 'ArrowRight') moveCursor(1);
});

// Init
document.getElementById('ind-deg').style.opacity = '1';
