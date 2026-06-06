/* ============================================
   信號與系統考前刷題 — Application Logic
   ============================================ */

// ---- State ----
let questions = [];
let currentQuestion = null;
let currentPool = [];
let currentPoolIndex = -1;
let currentMode = 'all';
let answerRevealed = false;

// ---- Constants ----
const STORAGE_KEY = 'signalQuizRecords';

// ---- Init ----
document.addEventListener('DOMContentLoaded', async () => {
  await loadQuestions();
  updateStats();
  populateChapterFilter();
});

// ---- Load Questions ----
async function loadQuestions() {
  try {
    const res = await fetch('exam_practice_questions_with_solutions_pretty.json');
    const data = await res.json();
    // Adapt to the data structure — questions are in data.questions
    questions = data.questions || data;
    if (!Array.isArray(questions)) {
      questions = Object.values(questions);
    }
    // Normalize fields
    questions = questions.map(q => normalizeQuestion(q));
    document.getElementById('totalBadge').innerHTML = `題庫：<strong>${questions.length}</strong> 題`;
  } catch (err) {
    console.error('Failed to load questions:', err);
    showToast('❌ 無法載入題庫檔案', 'error');
  }
}

function normalizeQuestion(q) {
  return {
    id: q.id || q.ID || '',
    title: q.title || q.Title || q.name || '',
    prompt: q.prompt || q.question || q.original_question || '',
    chapter: q.chapter || q.Chapter || '',
    sections: q.sections || q.section || [],
    type: q.type || q.Type || '',
    difficulty: q.difficulty || q.Difficulty || 'medium',
    latex: q.latex || q.Latex || null,
    final_answer: q.final_answer || q.finalAnswer || q.answer || '',
    solution_steps: q.solution_steps || q.solutionSteps || q.steps || [],
    key_formulas: q.key_formulas || q.formulas || q.Formulas || [],
    tags: q.tags || q.Tags || [],
  };
}

// ---- Page Navigation ----
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    // Re-trigger animation
    target.style.animation = 'none';
    target.offsetHeight; // reflow
    target.style.animation = '';
  }

  document.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add('active');

  if (page === 'home') updateStats();
  if (page === 'history') renderHistory();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Quiz Modes ----
function startQuiz(mode) {
  currentMode = mode;
  const selectorSection = document.getElementById('selectorSection');

  if (mode === 'all') {
    currentPool = shuffleArray([...questions]);
    currentPoolIndex = -1;
    showPage('quiz');
    nextQuestion();
  } else if (mode === 'wrong') {
    const records = getRecords();
    const wrongIds = [...new Set(records.filter(r => !r.correct).map(r => r.id))];
    if (wrongIds.length === 0) {
      showToast('🎉 沒有答錯的題目，你太厲害了！', 'success');
      return;
    }
    currentPool = shuffleArray(questions.filter(q => wrongIds.includes(q.id)));
    currentPoolIndex = -1;
    showPage('quiz');
    nextQuestion();
  } else if (mode === 'chapter') {
    const chapters = getUniqueValues('chapter');
    selectorSection.classList.remove('hidden');
    document.getElementById('selectorTitle').textContent = '選擇章節';
    renderSelectorChips(chapters, (val) => {
      currentPool = shuffleArray(questions.filter(q => q.chapter === val));
      currentPoolIndex = -1;
      selectorSection.classList.add('hidden');
      showPage('quiz');
      nextQuestion();
    });
  } else if (mode === 'type') {
    const types = getUniqueValues('type');
    selectorSection.classList.remove('hidden');
    document.getElementById('selectorTitle').textContent = '選擇題型';
    renderSelectorChips(types, (val) => {
      currentPool = shuffleArray(questions.filter(q => q.type === val));
      currentPoolIndex = -1;
      selectorSection.classList.add('hidden');
      showPage('quiz');
      nextQuestion();
    });
  }
}

function renderSelectorChips(values, callback) {
  const grid = document.getElementById('selectorGrid');
  grid.innerHTML = '';
  values.forEach(val => {
    const btn = document.createElement('button');
    btn.className = 'selector-chip';
    btn.textContent = formatLabel(val);
    btn.onclick = () => callback(val);
    grid.appendChild(btn);
  });
}

function getUniqueValues(field) {
  return [...new Set(questions.map(q => q[field]).filter(Boolean))].sort();
}

// ---- Question Display ----
function nextQuestion() {
  currentPoolIndex++;
  if (currentPoolIndex >= currentPool.length) {
    // Wrap around
    currentPool = shuffleArray(currentPool);
    currentPoolIndex = 0;
  }

  if (currentPool.length === 0) {
    showToast('⚠️ 該分類沒有題目', 'error');
    showPage('home');
    return;
  }

  currentQuestion = currentPool[currentPoolIndex];
  answerRevealed = false;
  renderQuestion(currentQuestion);
}

function renderQuestion(q) {
  document.getElementById('qId').textContent = q.id;
  document.getElementById('qChapter').textContent = `Ch. ${q.chapter}`;
  document.getElementById('qType').textContent = formatLabel(q.type);

  const diffEl = document.getElementById('qDifficulty');
  diffEl.textContent = q.difficulty;
  diffEl.className = `q-badge q-difficulty ${q.difficulty}`;

  document.getElementById('qProgress').textContent =
    `${currentPoolIndex + 1} / ${currentPool.length}`;



  // Process prompt text for math rendering
  const promptEl = document.getElementById('qPrompt');
  promptEl.textContent = '';
  const promptLines = (q.prompt || '').split('\n');
  promptLines.forEach((line, i) => {
    if (i > 0) promptEl.appendChild(document.createElement('br'));
    const span = document.createElement('span');
    span.textContent = processStepText(line);
    promptEl.appendChild(span);
  });

  // LaTeX expressions
  renderLatex(q);

  // Reset UI

  document.getElementById('solutionSection').classList.add('hidden');
  document.getElementById('nextSection').classList.add('hidden');
  document.getElementById('btnReveal').disabled = false;
  document.getElementById('btnCorrect').disabled = true;
  document.getElementById('btnWrong').disabled = true;

  // Re-render KaTeX
  requestAnimationFrame(() => renderMathInPage());
}

function renderLatex(q) {
  const container = document.getElementById('qLatex');
  container.innerHTML = '';

  if (!q.latex) return;

  if (typeof q.latex === 'string') {
    const block = createLatexBlock('', q.latex);
    container.appendChild(block);
  } else if (typeof q.latex === 'object') {
    for (const [key, val] of Object.entries(q.latex)) {
      const label = key === 'main' ? '' : `(${key})`;
      const block = createLatexBlock(label, val);
      container.appendChild(block);
    }
  }
}

function createLatexBlock(label, tex) {
  const div = document.createElement('div');
  div.className = 'latex-block';

  if (label) {
    const lbl = document.createElement('div');
    lbl.className = 'latex-label';
    lbl.textContent = label;
    div.appendChild(lbl);
  }

  const content = document.createElement('div');
  content.textContent = `$$${tex}$$`;
  div.appendChild(content);

  return div;
}

// ---- Answer Reveal ----
function revealAnswer() {
  answerRevealed = true;
  document.getElementById('btnReveal').disabled = true;
  document.getElementById('btnCorrect').disabled = false;
  document.getElementById('btnWrong').disabled = false;

  const q = currentQuestion;

  // Final answer
  const answerContainer = document.getElementById('solAnswer');
  answerContainer.innerHTML = '';
  if (typeof q.final_answer === 'string') {
    const part = document.createElement('div');
    part.className = 'answer-part';
    part.textContent = `$$${q.final_answer}$$`;
    answerContainer.appendChild(part);
  } else if (typeof q.final_answer === 'object') {
    for (const [key, val] of Object.entries(q.final_answer)) {
      const part = document.createElement('div');
      part.className = 'answer-part';
      if (key !== 'main') {
        const lbl = document.createElement('strong');
        lbl.textContent = `(${key}) `;
        part.appendChild(lbl);
      }
      const mathSpan = document.createElement('span');
      mathSpan.textContent = `$$${val}$$`;
      part.appendChild(mathSpan);
      answerContainer.appendChild(part);
    }
  }

  document.getElementById('solutionSection').classList.remove('hidden');

  requestAnimationFrame(() => renderMathInPage());

  // Smooth scroll to solution
  setTimeout(() => {
    document.getElementById('solutionSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

// ---- Mark Answer ----
function markAnswer(isCorrect) {
  const q = currentQuestion;
  const record = {
    id: q.id,
    title: q.title,
    chapter: q.chapter,
    type: q.type,
    difficulty: q.difficulty,
    userAnswer: '',
    correct: isCorrect,
    timestamp: new Date().toISOString(),
  };

  saveRecord(record);

  document.getElementById('btnCorrect').disabled = true;
  document.getElementById('btnWrong').disabled = true;
  document.getElementById('nextSection').classList.remove('hidden');

  if (isCorrect) {
    showToast('✅ 答對了！繼續加油！', 'success');
  } else {
    showToast('❌ 答錯了，下次一定行！', 'error');
  }

  // Scroll to next button
  setTimeout(() => {
    document.getElementById('nextSection').scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, 100);
}

// ---- Storage ----
function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecord(record) {
  const records = getRecords();
  records.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function clearRecords() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---- Stats ----
function updateStats() {
  const records = getRecords();
  const total = records.length;
  const correct = records.filter(r => r.correct).length;
  const wrong = total - correct;
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

  animateCounter('statAnswered', total);
  animateCounter('statCorrect', correct);
  animateCounter('statWrong', wrong);
  document.getElementById('statRate').textContent = `${rate}%`;
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  const current = parseInt(el.textContent) || 0;
  if (current === target) {
    el.textContent = target;
    return;
  }

  const diff = target - current;
  const duration = 400;
  const steps = 20;
  const stepTime = duration / steps;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    const progress = step / steps;
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(current + diff * eased);
    if (step >= steps) {
      el.textContent = target;
      clearInterval(timer);
    }
  }, stepTime);
}

// ---- History ----
function renderHistory() {
  const records = getRecords();
  const filterChapter = document.getElementById('filterChapter').value;
  const filterResult = document.getElementById('filterResult').value;

  let filtered = records;
  if (filterChapter) {
    filtered = filtered.filter(r => r.chapter === filterChapter);
  }
  if (filterResult === 'correct') {
    filtered = filtered.filter(r => r.correct);
  } else if (filterResult === 'wrong') {
    filtered = filtered.filter(r => !r.correct);
  }

  // Stats
  const total = filtered.length;
  const correct = filtered.filter(r => r.correct).length;
  const wrong = total - correct;
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

  document.getElementById('hTotal').textContent = total;
  document.getElementById('hCorrect').textContent = correct;
  document.getElementById('hWrong').textContent = wrong;
  document.getElementById('hRate').textContent = `${rate}%`;

  // Table
  const tbody = document.getElementById('historyBody');
  const emptyState = document.getElementById('emptyHistory');
  const tableWrapper = document.querySelector('.history-table-wrapper');

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    document.getElementById('historyTable').classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  document.getElementById('historyTable').classList.remove('hidden');

  // Show newest first
  const sorted = [...filtered].reverse();
  sorted.forEach(r => {
    const tr = document.createElement('tr');
    const date = new Date(r.timestamp);
    const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

    tr.innerHTML = `
      <td>${timeStr}</td>
      <td><span class="q-badge q-id">${r.id}</span></td>
      <td>${escapeHtml(r.title)}</td>
      <td>Ch. ${r.chapter}</td>
      <td>${formatLabel(r.type)}</td>
      <td><span class="result-badge ${r.correct ? 'correct' : 'wrong'}">${r.correct ? '✅ 答對' : '❌ 答錯'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function populateChapterFilter() {
  const records = getRecords();
  const chapters = [...new Set(records.map(r => r.chapter).filter(Boolean))].sort();
  const select = document.getElementById('filterChapter');

  // Keep the first "all" option
  while (select.options.length > 1) select.remove(1);

  chapters.forEach(ch => {
    const opt = document.createElement('option');
    opt.value = ch;
    opt.textContent = `Ch. ${ch}`;
    select.appendChild(opt);
  });
}

// ---- Reset ----
function confirmReset() {
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

function resetRecords() {
  clearRecords();
  closeModal();
  updateStats();
  renderHistory();
  populateChapterFilter();
  showToast('🗑️ 已清除所有作答紀錄', 'success');
}

// ---- Toast ----
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');

  // Force reflow
  toast.offsetHeight;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2500);
}

// ---- KaTeX Rendering ----
function renderMathInPage() {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
      throwOnError: false,
      trust: true,
    });
  }
}

// ---- Math Text Processing ----
// Converts raw step/prompt text containing Unicode math (ω, δ, ↔, etc.)
// and LaTeX-like notation (e^{-t}, u(t)) into KaTeX-renderable format
// by wrapping math segments in $...$ delimiters.

function processStepText(text) {
  if (!text || typeof text !== 'string') return text || '';
  return text.split('\n').map(processLine).join('\n');
}

function processLine(line) {
  // Regex character classes for math detection
  const STRONG_MATH = /[{}^_=ωΩδπαν∫↔→]/;
  const MATH_LIKE = /[=+\-*/^_{}()\[\]\\<>ωΩδπαν∫↔→]/;
  const IS_NUMBER = /^\d+\.?\d*$/;

  const tokens = line.split(/(\s+)/);
  const output = [];
  let mathBuf = [];
  let hasStrong = false;

  function flushBuf() {
    if (mathBuf.length === 0) return;
    if (hasStrong) {
      let expr = mathBuf.join('').trim();
      // Strip trailing sentence-ending punctuation from the math expression
      let trailing = '';
      const m = expr.match(/([.]+)$/);
      if (m) { trailing = m[1]; expr = expr.slice(0, -trailing.length); }
      if (expr) {
        expr = unicodeToLatex(expr);
        output.push('$' + expr + '$' + trailing);
      }
    } else {
      // Not math — push raw tokens back
      output.push(mathBuf.join(''));
    }
    mathBuf = [];
    hasStrong = false;
  }

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      // Whitespace: buffer it if we're inside a potential math group
      if (mathBuf.length > 0) {
        mathBuf.push(token);
      } else {
        output.push(token);
      }
    } else if (STRONG_MATH.test(token)) {
      // Token contains a strong math indicator
      hasStrong = true;
      mathBuf.push(token);
    } else if (MATH_LIKE.test(token) || IS_NUMBER.test(token)) {
      // Token looks math-like (operators, parens, numbers)
      mathBuf.push(token);
    } else {
      // Regular word — flush any pending math group first
      flushBuf();
      output.push(token);
    }
  }
  flushBuf();

  return output.join('');
}

function unicodeToLatex(expr) {
  return expr
    // Greek with following digit → subscript
    .replace(/ω(\d)/g, '\\omega_$1')
    .replace(/Ω(\d)/g, '\\Omega_$1')
    // Standalone Greek & symbols
    .replace(/ω/g, '\\omega ')
    .replace(/Ω/g, '\\Omega ')
    .replace(/δ/g, '\\delta ')
    .replace(/π/g, '\\pi ')
    .replace(/α/g, '\\alpha ')
    .replace(/ν/g, '\\nu ')
    // Arrows
    .replace(/↔/g, '\\leftrightarrow ')
    .replace(/→/g, '\\to ')
    // Integral
    .replace(/∫/g, '\\int ')
    // Superscript digits
    .replace(/²/g, '^{2}')
    .replace(/³/g, '^{3}')
    // Comparison
    .replace(/≥/g, '\\geq ')
    .replace(/≤/g, '\\leq ');
}

// ---- Utilities ----
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pad(n) {
  return n.toString().padStart(2, '0');
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatLabel(str) {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
