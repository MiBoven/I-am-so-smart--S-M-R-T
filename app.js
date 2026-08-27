// ============================================================
// KLUK — flashcard learning app for textbook chapters
// All UI strings are German for now; the STRINGS object below
// is the single place to add further languages later.
// ============================================================

const STRINGS = {
  de: {
    booksIntro: 'Ich bin so klug – K-L-U-K',
    startLearning: '📚 Lerneinheit starten',
    catalog: '📖 Fragenkatalog',
    achievements: '🏆 Achievements',
    settings: '⚙️ Einstellungen',
    modeNext: 'Nächstes',
    modeAll: 'Alle',
    modeParts: 'Nach Teil',
    modeCustom: 'Einzeln',
    startSession: 'Lerneinheit starten',
    flipHint: 'Tippen zum Umdrehen',
    moreDetail: 'Mehr anzeigen',
    moreExtra: 'Noch mehr anzeigen',
    dontKnow: 'Kann ich nicht',
    later: 'Später',
    know: 'Weiß ich',
    sessionDone: 'Lerneinheit abgeschlossen!',
    backHome: 'Zurück zum Start',
    noCards: 'Für diese Auswahl sind noch keine Karten vorhanden.'
  }
};
let lang = 'de';
function t(key) { return (STRINGS[lang] && STRINGS[lang][key]) || key; }

// ---------- Storage keys ----------
const LS_PROGRESS = 'kluk-progress';
const LS_SETTINGS = 'kluk-settings';

// ---------- App state ----------
const state = {
  manifest: null,
  chapterCache: {},   // file -> parsed chapter json
  currentBook: null,
  chapterMode: 'next',
  selectedParts: [],
  selectedChapters: [],
  session: null,       // { queue: [cards...], resolvedIds:Set, book, chapters, stats:{...} }
  navStack: []          // for back button
};

// ---------- Progress / settings persistence ----------
function loadProgress() {
  try {
    const raw = localStorage.getItem(LS_PROGRESS);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt data */ }
  return {
    cardStats: {},           // cardId -> { level, seen, everWrong, fixedCounted }
    totalAnswered: 0,
    correctTotal: 0,
    streak: { count: 0, lastDate: null },
    lateNightCount: 0,
    fixedAfterWrong: 0,
    chaptersSeenOnce: {},    // chapterId -> true
    chapterMastered: {},     // chapterId -> true
    lastChapter: {},         // bookId -> last studied chapter number
    achievementsUnlocked: []
  };
}
function saveProgress() { localStorage.setItem(LS_PROGRESS, JSON.stringify(progress)); }

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt data */ }
  return { sessionSize: 10, theme: 'dark', language: 'de' };
}
function saveSettings() { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }

let progress = loadProgress();
let settings = loadSettings();
lang = settings.language || 'de';

// ---------- Achievement definitions ----------
const ACHIEVEMENTS = [
  { id: 'nachteule', emoji: '🦉', name: 'Nachteule', cond: '20 Karten nach 22 Uhr gelernt',
    check: p => p.lateNightCount >= 20 },
  { id: 'dranbleiber', emoji: '🐢', name: 'Dranbleiber', cond: '7 Tage in Folge gelernt',
    check: p => p.streak.count >= 7 },
  { id: 'loewenmut', emoji: '🦁', name: 'Löwenmut', cond: '10 falsch beantwortete Karten später gemeistert',
    check: p => p.fixedAfterWrong >= 10 },
  { id: 'bienchen', emoji: '🐝', name: 'Fleißiges Bienchen', cond: '500 Karten insgesamt beantwortet',
    check: p => p.totalAnswered >= 500 },
  { id: 'kapitelmeister', emoji: '🦊', name: 'Kapitel-Meister', cond: 'Ein ganzes Kapitel gemeistert',
    check: p => Object.keys(p.chapterMastered || {}).length >= 1 },
  { id: 'vorratssammler', emoji: '🐿️', name: 'Vorratssammler', cond: 'Alle Kapitel eines Buchs mind. einmal gelernt',
    check: (p, ctx) => ctx && ctx.book && ctx.book.chapters.every(c => p.chaptersSeenOnce[chapterKey(ctx.book.id, c.number)]) }
];
function chapterKey(bookId, chapterNumber) { return bookId + ':' + chapterNumber; }

// ============================================================
// Data loading
// ============================================================
async function loadManifest() {
  if (state.manifest) return state.manifest;
  const res = await fetch('chapters/manifest.json');
  state.manifest = await res.json();
  return state.manifest;
}

async function loadChapterFile(file) {
  if (state.chapterCache[file]) return state.chapterCache[file];
  const res = await fetch('chapters/' + file);
  const data = await res.json();
  state.chapterCache[file] = data;
  return data;
}

async function loadAllChapters(book) {
  const results = [];
  for (const ch of book.chapters) {
    const data = await loadChapterFile(ch.file);
    results.push(data);
  }
  return results;
}

// ============================================================
// Navigation
// ============================================================
function showScreen(id, opts) {
  opts = opts || {};
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('backBtn').style.display = opts.canGoBack ? 'block' : 'none';
  document.getElementById('headerTitle').textContent = opts.title || 'KLUK';
  if (opts.pushHistory !== false) state.navStack.push(id);
}
function goBack() {
  state.navStack.pop(); // remove current
  const prev = state.navStack.pop() || 'screen-home';
  navigateTo(prev);
}
// central place mapping screen ids back to their render function, used by goBack
function navigateTo(id) {
  if (id === 'screen-books') renderBooks();
  else if (id === 'screen-home') renderHome();
  else if (id === 'screen-chapters') renderChapterSelect();
  else if (id === 'screen-catalog') renderCatalog();
  else if (id === 'screen-achievements') renderAchievements();
  else if (id === 'screen-settings') renderSettings();
  else showScreen(id);
}

// ============================================================
// Book selection
// ============================================================
async function renderBooks() {
  const manifest = await loadManifest();
  const list = document.getElementById('bookList');
  list.innerHTML = '';
  manifest.books.forEach(book => {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.innerHTML = `<strong>${book.title}</strong><br><span style="font-weight:400;color:var(--text-secondary);font-size:12.5px;">${book.author} · ${book.edition}</span>`;
    btn.addEventListener('click', () => {
      state.currentBook = book;
      showScreen('screen-home', { canGoBack: manifest.books.length > 1, title: 'KLUK' });
      renderHome();
    });
    list.appendChild(btn);
  });
  showScreen('screen-books', { canGoBack: false, title: 'KLUK', pushHistory: false });
  document.getElementById('booksIntro').textContent = t('booksIntro');

  // Skip straight to home if there is exactly one book (common case for now)
  if (manifest.books.length === 1) {
    state.currentBook = manifest.books[0];
    showScreen('screen-home', { canGoBack: false, title: 'KLUK' });
    renderHome();
  }
}

function renderHome() {
  const book = state.currentBook;
  const card = document.getElementById('homeBookCard');
  card.innerHTML = `<h2>${book.title}</h2><div class="meta">${book.author} · ${book.edition}</div>`;
  document.getElementById('btnStartLearning').textContent = t('startLearning');
  document.getElementById('btnCatalog').textContent = t('catalog');
  document.getElementById('btnAchievements').textContent = t('achievements');
  document.getElementById('btnSettings').textContent = t('settings');
  showScreen('screen-home', { canGoBack: false, title: 'KLUK' });
}

// ============================================================
// Chapter selection
// ============================================================
function renderChapterSelect() {
  document.querySelectorAll('#chapterModeToggle .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.chapterMode);
  });
  renderChapterModeDetail();
  showScreen('screen-chapters', { canGoBack: true, title: 'Kapitel wählen' });
}

function renderChapterModeDetail() {
  const book = state.currentBook;
  const detail = document.getElementById('chapterModeDetail');
  const hint = document.getElementById('chapterCountHint');
  detail.innerHTML = '';

  if (state.chapterMode === 'next') {
    const lastNum = progress.lastChapter[book.id] || 0;
    const sorted = [...book.chapters].sort((a, b) => a.number - b.number);
    const next = sorted.find(c => c.number > lastNum) || sorted[0];
    detail.innerHTML = `<p>Nächstes noch nicht gelerntes Kapitel:</p><p style="font-weight:600;">Kapitel ${next.number} – ${next.title}</p>`;
    state.selectedChapters = [next.number];
  } else if (state.chapterMode === 'all') {
    detail.innerHTML = `<p>Alle ${book.chapters.length} Kapitel werden gemischt.</p>`;
    state.selectedChapters = book.chapters.map(c => c.number);
  } else if (state.chapterMode === 'parts') {
    const row = document.createElement('div');
    row.className = 'chip-row';
    book.parts.forEach(part => {
      const chip = document.createElement('button');
      chip.className = 'chip' + (state.selectedParts.includes(part.number) ? ' active' : '');
      chip.textContent = `Teil ${romanize(part.number)} – ${part.title}`;
      chip.addEventListener('click', () => {
        const idx = state.selectedParts.indexOf(part.number);
        if (idx === -1) state.selectedParts.push(part.number); else state.selectedParts.splice(idx, 1);
        renderChapterModeDetail();
      });
      row.appendChild(chip);
    });
    detail.appendChild(row);
    state.selectedChapters = book.chapters.filter(c => state.selectedParts.includes(c.part)).map(c => c.number);
  } else if (state.chapterMode === 'custom') {
    const list = document.createElement('div');
    list.className = 'checkbox-list';
    book.chapters.forEach(ch => {
      const label = document.createElement('label');
      const checked = state.selectedChapters.includes(ch.number);
      label.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''} data-num="${ch.number}"> Kapitel ${ch.number} – ${ch.title}`;
      label.querySelector('input').addEventListener('change', e => {
        const num = parseInt(e.target.dataset.num);
        if (e.target.checked) state.selectedChapters.push(num);
        else state.selectedChapters = state.selectedChapters.filter(n => n !== num);
        renderChapterModeDetail();
      });
      list.appendChild(label);
    });
    detail.appendChild(list);
  }

  hint.textContent = state.selectedChapters.length
    ? `${state.selectedChapters.length} Kapitel ausgewählt`
    : 'Keine Kapitel ausgewählt';
}

function romanize(n) { return ['', 'I', 'II', 'III', 'IV', 'V'][n] || String(n); }

document.getElementById('chapterModeToggle').addEventListener('click', e => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  state.chapterMode = btn.dataset.mode;
  renderChapterSelect();
});

document.getElementById('btnStartSession').addEventListener('click', async () => {
  if (!state.selectedChapters.length) { showToast(t('noCards')); return; }
  await startSession(state.selectedChapters);
});

// ============================================================
// Session logic
// ============================================================
function getCardProgress(cardId) {
  if (!progress.cardStats[cardId]) {
    progress.cardStats[cardId] = { level: 0, seen: 0, everWrong: false, fixedCounted: false };
  }
  return progress.cardStats[cardId];
}

function weightForLevel(level) { return level === 0 ? 3 : level === 1 ? 2 : 1; }

function weightedSample(cards, n) {
  const pool = cards.map(c => ({ card: c, weight: weightForLevel(getCardProgress(c.id).level) }));
  const chosen = [];
  while (chosen.length < n && pool.length) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { r -= pool[idx].weight; if (r <= 0) break; }
    chosen.push(pool[idx].card);
    pool.splice(idx, 1);
  }
  return chosen;
}

async function startSession(chapterNumbers) {
  const book = state.currentBook;
  const chapterDefs = book.chapters.filter(c => chapterNumbers.includes(c.number));
  const chapterDatas = await Promise.all(chapterDefs.map(c => loadChapterFile(c.file)));
  let allCards = [];
  chapterDatas.forEach((chData, i) => {
    chData.cards.forEach(card => allCards.push(Object.assign({}, card, {
      chapterNumber: chData.chapter, chapterTitle: chData.title, part: chData.part
    })));
  });
  if (!allCards.length) { showToast(t('noCards')); return; }

  const size = Math.min(settings.sessionSize, allCards.length);
  const queue = weightedSample(allCards, size);

  state.session = {
    book, chapterDefs,
    queue,
    total: queue.length,
    resolvedCount: 0,
    stats: { correct: 0, wrong: 0, later: 0, lateNight: 0, fixedThisSession: 0 },
    current: null,
    flipStage: 0 // 0 = front, 1 = simple shown, 2 = detail shown, 3 = extra shown
  };

  showScreen('screen-session', { canGoBack: false, title: 'Lernen' });
  showNextCard();
}

function showNextCard() {
  const session = state.session;
  if (!session.queue.length) { finishSession(); return; }
  session.current = session.queue.shift();
  session.flipStage = 0;
  renderSessionCard();
}

function renderSessionCard() {
  const session = state.session;
  const card = session.current;
  const flashcardInner = document.getElementById('flashcardInner');
  flashcardInner.classList.remove('flipped');

  document.getElementById('cardSectionLabel').textContent = `Kapitel ${card.chapterNumber}${card.section ? ' · ' + card.section : ''}`;
  document.getElementById('cardQuestion').textContent = card.question;

  const img = document.getElementById('cardImage');
  if (card.images && card.images.length) {
    img.src = 'images/' + card.images[0];
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }

  document.getElementById('answerSimple').textContent = card.answerSimple || '';
  document.getElementById('answerDetail').textContent = card.answerDetail || '';
  document.getElementById('answerExtra').textContent = card.extra || '';
  document.getElementById('answerDetailBlock').style.display = 'none';
  document.getElementById('answerExtraBlock').style.display = 'none';
  document.getElementById('moreBtn1').style.display = card.answerDetail ? 'block' : 'none';
  document.getElementById('moreBtn2').style.display = 'none';
  document.getElementById('sessionActions').style.visibility = 'hidden';

  updateProgressBar();
}

function updateProgressBar() {
  const session = state.session;
  const pct = Math.round((session.resolvedCount / session.total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `Karte ${session.resolvedCount + 1} von ${session.total}`;
}

document.getElementById('flashcardInner').addEventListener('click', () => {
  const session = state.session;
  if (!session) return;
  const inner = document.getElementById('flashcardInner');
  if (!inner.classList.contains('flipped')) {
    inner.classList.add('flipped');
    document.getElementById('sessionActions').style.visibility = 'visible';
  }
});

document.getElementById('moreBtn1').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('answerDetailBlock').style.display = 'block';
  e.target.style.display = 'none';
  const card = state.session.current;
  if (card.extra) document.getElementById('moreBtn2').style.display = 'block';
});
document.getElementById('moreBtn2').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('answerExtraBlock').style.display = 'block';
  e.target.style.display = 'none';
});

document.getElementById('cardImage').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('modalImage').src = e.target.src;
  document.getElementById('imageModalBg').classList.add('open');
});
document.getElementById('closeImageModal').addEventListener('click', () => {
  document.getElementById('imageModalBg').classList.remove('open');
});

document.getElementById('btnYes').addEventListener('click', () => rateCard('yes'));
document.getElementById('btnNo').addEventListener('click', () => rateCard('no'));
document.getElementById('btnLater').addEventListener('click', () => rateCard('later'));

function rateCard(result) {
  const session = state.session;
  const card = session.current;
  const cp = getCardProgress(card.id);
  const isLateNight = new Date().getHours() >= 22;

  if (result === 'later') {
    session.stats.later++;
    session.queue.push(card); // goes to the back of the same session's queue
  } else {
    session.resolvedCount++;
    cp.seen++;
    if (result === 'yes') {
      session.stats.correct++;
      cp.level = Math.min(cp.level + 1, 2);
      if (cp.everWrong && !cp.fixedCounted) {
        cp.fixedCounted = true;
        session.stats.fixedThisSession++;
      }
    } else {
      session.stats.wrong++;
      cp.level = 0;
      cp.everWrong = true;
    }
    if (isLateNight) session.stats.lateNight++;
  }
  showNextCard();
}

function finishSession() {
  const session = state.session;
  const book = session.book;

  // merge session stats into persisted progress
  const answered = session.stats.correct + session.stats.wrong;
  progress.totalAnswered += answered;
  progress.correctTotal += session.stats.correct;
  progress.lateNightCount += session.stats.lateNight;
  progress.fixedAfterWrong += session.stats.fixedThisSession;

  // streak handling (one increment per calendar day)
  const today = new Date().toISOString().slice(0, 10);
  if (progress.streak.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    progress.streak.count = (progress.streak.lastDate === yesterday) ? progress.streak.count + 1 : 1;
    progress.streak.lastDate = today;
  }

  // mark chapters as seen / update "next chapter" pointer / check full mastery
  session.chapterDefs.forEach(chDef => {
    progress.chaptersSeenOnce[chapterKey(book.id, chDef.number)] = true;
    const current = progress.lastChapter[book.id] || 0;
    if (chDef.number >= current) progress.lastChapter[book.id] = chDef.number;

    const chData = state.chapterCache[chDef.file];
    if (chData) {
      const allMastered = chData.cards.every(c => getCardProgress(c.id).level === 2);
      if (allMastered) progress.chapterMastered[chapterKey(book.id, chDef.number)] = true;
    }
  });

  const newlyUnlocked = checkAchievements();
  saveProgress();
  renderSummary(session.stats, newlyUnlocked);
}

function checkAchievements() {
  const ctx = { book: state.currentBook };
  const newly = [];
  ACHIEVEMENTS.forEach(a => {
    if (!progress.achievementsUnlocked.includes(a.id) && a.check(progress, ctx)) {
      progress.achievementsUnlocked.push(a.id);
      newly.push(a);
    }
  });
  return newly;
}

function renderSummary(stats, newlyUnlocked) {
  document.getElementById('summaryStats').innerHTML = `
    <div><span class="num">${stats.correct}</span><span class="lbl">Weiß ich</span></div>
    <div><span class="num">${stats.wrong}</span><span class="lbl">Kann ich nicht</span></div>
    <div><span class="num">${stats.later}</span><span class="lbl">Später</span></div>
  `;
  const achDiv = document.getElementById('summaryAchievements');
  achDiv.innerHTML = newlyUnlocked.length
    ? '<p>Neues Abzeichen freigeschaltet:</p>' + newlyUnlocked.map(a => `<span class="unlocked-badge">${a.emoji} ${a.name}</span>`).join('')
    : '';
  showScreen('screen-summary', { canGoBack: false, title: 'Fertig' });
}

document.getElementById('btnSummaryHome').addEventListener('click', renderHome);

// ============================================================
// Catalog (Fragenkatalog)
// ============================================================
let catalogAllCards = null;
let catalogFilterPart = null;

async function renderCatalog() {
  showScreen('screen-catalog', { canGoBack: true, title: 'Fragenkatalog' });
  if (!catalogAllCards) {
    const chapters = await loadAllChapters(state.currentBook);
    catalogAllCards = [];
    chapters.forEach(chData => {
      chData.cards.forEach(card => catalogAllCards.push(Object.assign({}, card, {
        chapterNumber: chData.chapter, chapterTitle: chData.title, part: chData.part
      })));
    });
  }
  renderCatalogFilters();
  renderCatalogList('');
}

function renderCatalogFilters() {
  const row = document.getElementById('catalogFilters');
  row.innerHTML = '';
  state.currentBook.parts.forEach(part => {
    const chip = document.createElement('button');
    chip.className = 'chip' + (catalogFilterPart === part.number ? ' active' : '');
    chip.textContent = `Teil ${romanize(part.number)}`;
    chip.addEventListener('click', () => {
      catalogFilterPart = (catalogFilterPart === part.number) ? null : part.number;
      renderCatalogFilters();
      renderCatalogList(document.getElementById('catalogSearch').value);
    });
    row.appendChild(chip);
  });
}

function renderCatalogList(query) {
  const list = document.getElementById('catalogList');
  const q = (query || '').toLowerCase().trim();
  const filtered = catalogAllCards.filter(c => {
    if (catalogFilterPart !== null && c.part !== catalogFilterPart) return false;
    if (!q) return true;
    return (c.question + ' ' + c.answerSimple).toLowerCase().includes(q);
  });
  list.innerHTML = '';
  if (!filtered.length) { list.innerHTML = `<p class="hint">${t('noCards')}</p>`; return; }
  filtered.forEach(c => {
    const item = document.createElement('div');
    item.className = 'catalog-item';
    item.innerHTML = `
      <div class="q">${c.question}</div>
      <div class="meta">Kapitel ${c.chapterNumber}${c.section ? ' · ' + c.section : ''}</div>
      <div class="a">
        <strong>${c.answerSimple}</strong><br>${c.answerDetail || ''}
        ${c.extra ? '<br><em>' + c.extra + '</em>' : ''}
      </div>`;
    item.addEventListener('click', () => item.classList.toggle('open'));
    list.appendChild(item);
  });
}

document.getElementById('catalogSearch').addEventListener('input', e => renderCatalogList(e.target.value));

// ============================================================
// Achievements screen
// ============================================================
function renderAchievements() {
  showScreen('screen-achievements', { canGoBack: true, title: 'Achievements' });
  const grid = document.getElementById('statsGrid');
  const accuracy = progress.totalAnswered ? Math.round((progress.correctTotal / progress.totalAnswered) * 100) : 0;
  grid.innerHTML = `
    <div class="stat-card"><div class="num">${progress.totalAnswered}</div><div class="lbl">Karten beantwortet</div></div>
    <div class="stat-card"><div class="num">${accuracy}%</div><div class="lbl">Trefferquote</div></div>
    <div class="stat-card"><div class="num">${progress.streak.count}</div><div class="lbl">Tage in Folge</div></div>
    <div class="stat-card"><div class="num">${Object.keys(progress.chapterMastered).length}</div><div class="lbl">Kapitel gemeistert</div></div>
  `;
  const badgeGrid = document.getElementById('badgeGrid');
  badgeGrid.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const unlocked = progress.achievementsUnlocked.includes(a.id);
    const el = document.createElement('div');
    el.className = 'badge' + (unlocked ? ' unlocked' : '');
    el.innerHTML = `<span class="emoji">${a.emoji}</span><div class="name">${a.name}</div><div class="cond">${a.cond}</div>`;
    badgeGrid.appendChild(el);
  });
}

// ============================================================
// Settings
// ============================================================
function renderSettings() {
  showScreen('screen-settings', { canGoBack: true, title: 'Einstellungen' });
  document.getElementById('sessionSizeInput').value = settings.sessionSize;
  document.getElementById('sessionSizeLabel').textContent = settings.sessionSize;
  document.getElementById('languageSelect').value = settings.language || 'de';
}

document.getElementById('sessionSizeInput').addEventListener('input', e => {
  settings.sessionSize = parseInt(e.target.value);
  document.getElementById('sessionSizeLabel').textContent = settings.sessionSize;
  saveSettings();
});
document.getElementById('languageSelect').addEventListener('change', e => {
  settings.language = e.target.value;
  lang = settings.language;
  saveSettings();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = JSON.stringify({ progress, settings }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kluk-fortschritt.json';
  a.click();
});
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.progress) progress = data.progress;
      if (data.settings) settings = data.settings;
      saveProgress(); saveSettings();
      lang = settings.language || 'de';
      showToast('Fortschritt importiert.');
      renderSettings();
    } catch (err) {
      showToast('Datei konnte nicht gelesen werden.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Wirklich den gesamten Lernfortschritt zurücksetzen? Das kann nicht rückgängig gemacht werden.')) return;
  progress = loadProgress.__proto__ ? JSON.parse(JSON.stringify({
    cardStats: {}, totalAnswered: 0, correctTotal: 0, streak: { count: 0, lastDate: null },
    lateNightCount: 0, fixedAfterWrong: 0, chaptersSeenOnce: {}, chapterMastered: {},
    lastChapter: {}, achievementsUnlocked: []
  })) : progress;
  saveProgress();
  showToast('Fortschritt zurückgesetzt.');
  renderAchievements();
});

// ============================================================
// Global chrome: header buttons, theme, fullscreen, toast
// ============================================================
document.getElementById('backBtn').addEventListener('click', goBack);
document.getElementById('btnStartLearning').addEventListener('click', () => {
  state.chapterMode = 'next';
  state.selectedChapters = [];
  state.selectedParts = [];
  renderChapterSelect();
});
document.getElementById('btnCatalog').addEventListener('click', renderCatalog);
document.getElementById('btnAchievements').addEventListener('click', renderAchievements);
document.getElementById('btnSettings').addEventListener('click', renderSettings);

const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  settings.theme = theme;
  saveSettings();
  themeToggle.textContent = theme === 'dark' ? '◐' : '◑';
}
setTheme(settings.theme || 'dark');
themeToggle.addEventListener('click', () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

document.getElementById('fullscreenToggle').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
});

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// Warn before an accidental reload/navigation discards an in-progress session
window.addEventListener('beforeunload', e => {
  if (state.session && state.session.resolvedCount < state.session.total) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ============================================================
// Init
// ============================================================
renderBooks();
