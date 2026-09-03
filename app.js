// ============================================================
// KLUK — flashcard learning app for textbook chapters
// All UI strings are German for now; the STRINGS object below
// is the single place to add further languages later.
// ============================================================

const STRINGS = {
  de: {
    startLearning: '📚 Lerneinheit starten',
    catalog: '🗃️ Karteikartenbox',
    achievements: '🏆 Achievements',
    bookInfo: 'ℹ️ Über das Buch',
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
    sessionDone: 'Lerninhalt abgeschlossen!',
    backHome: 'Zurück zu Brainfood',
    noCards: 'Für diese Auswahl sind noch keine Karten vorhanden.'
  }
};
let lang = 'de';
function t(key) { return (STRINGS[lang] && STRINGS[lang][key]) || key; }

// ---------- Icon set (inline SVGs, styled via currentColor) ----------
// Most icons are simple outline strokes; the gear is a solid filled shape
// (rounded-tooth cog, closer to a standard OS settings icon) built from a
// generated polygon plus an inner hole drawn with fill-rule="evenodd".
const ICON_PATHS = {
  sun: { d: '<circle cx="12" cy="12" r="4"/><path d="M12 2 V4 M12 20 V22 M2 12 H4 M20 12 H22 M4.93 4.93 L6.34 6.34 M17.66 17.66 L19.07 19.07 M19.07 4.93 L17.66 6.34 M6.34 17.66 L4.93 19.07"/>' },
  moon: { d: '<path d="M20.5 15.5 A8.5 8.5 0 0 1 8.5 3.5 A8.5 8.5 0 1 0 20.5 15.5 Z"/>' },
  fullscreenOn: { d: '<path d="M9 3 H3 V9 M15 3 H21 V9 M21 15 V21 H15 M3 15 V21 H9"/>' },
  fullscreenOff: { d: '<path d="M9 3 V9 H3 M15 3 V9 H21 M21 15 H15 V21 M3 15 H9 V21"/>' },
  arrowLeft: { d: '<path d="M19 12 H5 M10 7 L5 12 L10 17"/>' },
  arrowRight: { d: '<path d="M5 12 H19 M14 7 L19 12 L14 17"/>' },
  skipFirst: { d: '<path d="M7 5 V19 M17 6 L9 12 L17 18"/>' },
  skipLast: { d: '<path d="M17 5 V19 M7 6 L15 12 L7 18"/>' },
  book: { d: '<path d="M12 6 C10 4.5 7 4 4 4 V18 C7 18 10 18.5 12 20 C14 18.5 17 18 20 18 V4 C17 4 14 4.5 12 6 Z M12 6 V20"/>' },
  gear: {
    d: '<path d="M 9.24,5.35 L 10.0,2.61 L 14.0,2.61 L 14.76,5.35 L 17.23,3.95 L 20.05,6.77 L 18.65,9.24 L 21.39,10.0 L 21.39,14.0 L 18.65,14.76 L 20.05,17.23 L 17.23,20.05 L 14.76,18.65 L 14.0,21.39 L 10.0,21.39 L 9.24,18.65 L 6.77,20.05 L 3.95,17.23 L 5.35,14.76 L 2.61,14.0 L 2.61,10.0 L 5.35,9.24 L 3.95,6.77 L 6.77,3.95 Z M 15.4,12 A 3.4,3.4 0 1,0 8.6,12 A 3.4,3.4 0 1,0 15.4,12 Z" fill-rule="evenodd"/>',
    filled: true
  }
};
function icon(name) {
  const def = ICON_PATHS[name];
  const attrs = def.filled
    ? 'fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"'
    : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg viewBox="0 0 24 24" ${attrs}>${def.d}</svg>`;
}

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
  chapterSessionSize: 10, // per-session override, does not touch the settings default
  session: null,       // { queue: [cards...], resolvedIds:Set, book, chapters, stats:{...} }
  navStack: [],         // for back button
  isPopping: false      // true while handling a popstate, to avoid re-pushing history
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
  return { sessionSize: 10, theme: 'dark', language: 'de', favoriteBooks: [] };
}
function saveSettings() { localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }

let progress = loadProgress();
let settings = loadSettings();
if (!Array.isArray(settings.favoriteBooks)) settings.favoriteBooks = [];
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

// Small collection of playful/teasing one-liners shown when flipping a
// session card back from the answer to the question side (see
// showFlipBackCaption below). Loaded once and cached.
async function loadFlipQuotes() {
  if (state.flipQuotes) return state.flipQuotes;
  try {
    const res = await fetch('data/flip-quotes.json');
    state.flipQuotes = await res.json();
  } catch (e) {
    state.flipQuotes = [];
  }
  return state.flipQuotes;
}

// ============================================================
// Navigation
// ============================================================
// Every screen-level transition pushes one browser history entry, carrying
// a full snapshot of our own navStack. This lets the hardware/browser back
// button (popstate) and the in-app back arrow share one code path, and lets
// us jump back several steps at once (e.g. "Zurück zu Brainfood") simply by
// calling history.go(-n) and letting popstate re-render the target screen.
function setHeaderSubtitle(shortText, longText) {
  const el = document.getElementById('headerSubtitle');
  if (shortText == null) { el.style.display = 'none'; return; }
  el.querySelector('.sub-short').textContent = shortText;
  el.querySelector('.sub-long').textContent = longText != null ? longText : shortText;
  el.style.display = 'block';
}

function showScreen(id, opts) {
  opts = opts || {};
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.getElementById('backBtn').style.display = opts.canGoBack ? 'flex' : 'none';
  document.getElementById('headerTitle').textContent = opts.title || 'K-L-U-K';
  setHeaderSubtitle(opts.showSubtitle ? (opts.subtitleShort || '') : null, opts.subtitleLong);

  // While replaying a popstate, state.navStack has already been restored
  // from the saved history entry, so we must not push onto it again here.
  if (opts.pushHistory !== false && !state.isPopping) {
    state.navStack.push(id);
    history.pushState({ stack: state.navStack.slice() }, '', '#' + id);
  }
}

// In-app back arrow: just replay real browser history; the popstate
// handler below does the actual re-rendering, so hardware/gesture back
// behaves identically to tapping the arrow.
function goBack() { history.back(); }

// Jump back to the most recent occurrence of `targetId` in the nav stack
// (e.g. summary screen -> "Zurück zu Brainfood"), collapsing every screen
// in between out of the browser history in one go.
function goBackTo(targetId, fallbackRender) {
  const idx = state.navStack.lastIndexOf(targetId);
  if (idx !== -1 && idx < state.navStack.length - 1) {
    history.go(idx - (state.navStack.length - 1));
  } else if (fallbackRender) {
    fallbackRender();
  }
}

window.addEventListener('popstate', e => {
  if (!e.state || !e.state.stack) return;
  const wasOnUnfinishedSession = state.navStack[state.navStack.length - 1] === 'screen-session'
    && state.session && state.session.resolvedCount < state.session.total;

  state.isPopping = true;
  state.navStack = e.state.stack.slice();
  navigateTo(state.navStack[state.navStack.length - 1]);
  state.isPopping = false;

  if (wasOnUnfinishedSession) {
    showToast('Lerneinheit abgebrochen – dein Fortschritt wurde nicht gespeichert.');
  }
});

// central place mapping screen ids back to their render function, used by popstate/goBack
function navigateTo(id) {
  if (id === 'screen-welcome') renderWelcome();
  else if (id === 'screen-books') renderBooks();
  else if (id === 'screen-home') renderHome();
  else if (id === 'screen-bookinfo') renderBookInfo();
  else if (id === 'screen-chapters') renderChapterSelect();
  else if (id === 'screen-catalog') renderCatalog();
  else if (id === 'screen-achievements') renderAchievements();
  else if (id === 'screen-settings') renderSettings();
  else showScreen(id, { pushHistory: false });
}

// ============================================================
// Welcome screen (app entry point)
// ============================================================
function renderWelcome() {
  document.getElementById('heroIcon').innerHTML = icon('book');
  showScreen('screen-welcome', {
    canGoBack: false, title: 'K-L-U-K', showSubtitle: true,
    subtitleShort: 'Ich werd so klug', subtitleLong: 'Ich werd so klug, K-L-U-K'
  });
}
document.getElementById('btnGoToBooks').addEventListener('click', renderBooks);

// ============================================================
// Book selection
// ============================================================
function sortByTitle(books) {
  return [...books].sort((a, b) => a.title.localeCompare(b.title, 'de'));
}

function renderBookRow(book, manifest) {
  const row = document.createElement('div');
  row.className = 'book-row';

  const isFav = settings.favoriteBooks.includes(book.id);
  const favBtn = document.createElement('button');
  favBtn.className = 'fav-btn' + (isFav ? ' active' : '');
  favBtn.textContent = isFav ? '♥' : '♡';
  favBtn.title = isFav ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen';
  favBtn.addEventListener('click', e => {
    e.stopPropagation();
    const idx = settings.favoriteBooks.indexOf(book.id);
    if (idx === -1) settings.favoriteBooks.push(book.id); else settings.favoriteBooks.splice(idx, 1);
    saveSettings();
    renderBookList(manifest); // just refresh the list, not a navigation event
  });

  const btn = document.createElement('button');
  btn.className = 'menu-btn';
  btn.innerHTML = `<strong>${book.title}</strong><br><span style="font-weight:400;color:var(--text-secondary);font-size:12.5px;">${book.author}</span>`;
  btn.addEventListener('click', () => {
    state.currentBook = book;
    renderHome();
  });

  row.appendChild(btn);
  row.appendChild(favBtn);
  return row;
}

function renderBookList(manifest) {
  const list = document.getElementById('bookList');
  list.innerHTML = '';
  const favorites = sortByTitle(manifest.books.filter(b => settings.favoriteBooks.includes(b.id)));
  const others = sortByTitle(manifest.books.filter(b => !settings.favoriteBooks.includes(b.id)));
  favorites.forEach(book => list.appendChild(renderBookRow(book, manifest)));
  if (favorites.length && others.length) {
    const divider = document.createElement('hr');
    divider.className = 'book-list-divider';
    list.appendChild(divider);
  }
  others.forEach(book => list.appendChild(renderBookRow(book, manifest)));
}

async function renderBooks() {
  const manifest = await loadManifest();
  renderBookList(manifest);

  showScreen('screen-books', {
    canGoBack: true, title: 'Bücher & Skripte', showSubtitle: true,
    subtitleShort: 'Brainfood Speisekarte', subtitleLong: 'Brainfood Speisekarte'
  });

  // Skip straight to home if there is exactly one book (common case for now)
  if (manifest.books.length === 1) {
    state.currentBook = manifest.books[0];
    renderHome();
  }
}

function renderHome() {
  const book = state.currentBook;
  const card = document.getElementById('homeBookCard');
  card.innerHTML = `<h2>${book.title}</h2><div class="meta">${book.author}</div>`;
  document.getElementById('btnStartLearning').textContent = t('startLearning');
  document.getElementById('btnCatalog').textContent = t('catalog');
  document.getElementById('btnAchievements').textContent = t('achievements');
  document.getElementById('btnBookInfo').textContent = t('bookInfo');
  const canGoBack = !!(state.manifest && state.manifest.books.length > 1);
  showScreen('screen-home', {
    canGoBack, title: 'Brainfood', showSubtitle: true,
    subtitleShort: 'Guten Appetit', subtitleLong: 'Viel Erfolg und guten Appetit'
  });
}

// ============================================================
// Book info ("Über das Buch")
// ============================================================
function renderBookInfo() {
  const book = state.currentBook;
  const rows = [];
  rows.push(`<div class="book-info-row"><div class="label">Autor</div><div class="value">${book.author || '–'}</div></div>`);
  if (book.edition) rows.push(`<div class="book-info-row"><div class="label">Auflage / Ausgabe</div><div class="value">${book.edition}</div></div>`);
  if (book.year) rows.push(`<div class="book-info-row"><div class="label">Erscheinungsjahr</div><div class="value">${book.year}</div></div>`);
  if (book.description) rows.push(`<div class="book-info-row"><div class="label">Beschreibung</div><div class="value">${book.description}</div></div>`);
  if (rows.length === 1) rows.push(`<p class="hint">Weitere Angaben zu diesem Buch sind noch nicht hinterlegt.</p>`);

  document.getElementById('bookInfoCard').innerHTML = `
    <div class="book-info-title">${book.title}</div>
    ${rows.join('')}
  `;
  showScreen('screen-bookinfo', { canGoBack: true, title: 'Über das Buch' });
}
document.getElementById('btnBookInfo').addEventListener('click', renderBookInfo);

// ============================================================
// Chapter selection
// ============================================================
function renderChapterSelect() {
  document.querySelectorAll('#chapterModeToggle .seg-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.chapterMode);
  });
  renderChapterModeDetail();
  document.getElementById('chapterSessionSizeInput').value = state.chapterSessionSize;
  document.getElementById('chapterSessionSizeLabel').textContent = state.chapterSessionSize;
  showScreen('screen-chapters', { canGoBack: true, title: 'Lerneinheit starten' });
}
document.getElementById('chapterSessionSizeInput').addEventListener('input', e => {
  state.chapterSessionSize = parseInt(e.target.value);
  document.getElementById('chapterSessionSizeLabel').textContent = state.chapterSessionSize;
});

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
  document.querySelectorAll('#chapterModeToggle .seg-btn').forEach(b => b.classList.toggle('active', b === btn));
  renderChapterModeDetail(); // switching modes stays within the same screen, so no new history entry
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

  const size = Math.min(state.chapterSessionSize || settings.sessionSize, allCards.length);
  const queue = weightedSample(allCards, size);

  state.session = {
    book, chapterDefs,
    queue,
    total: queue.length,
    resolvedCount: 0,
    stats: { correct: 0, wrong: 0, later: 0, lateNight: 0, fixedThisSession: 0 },
    current: null,
    // review data: original draw order + per-card outcome, for "Antworten nochmal anschauen"
    initialOrder: queue.map(c => c.id),
    cardsById: Object.fromEntries(queue.map(c => [c.id, c])),
    results: {}
  };

  showScreen('screen-session', { canGoBack: true, title: 'Lernen' });
  showNextCard();
}

function showNextCard() {
  const session = state.session;
  if (!session.queue.length) { finishSession(); return; }
  session.current = session.queue.shift();
  renderSessionCard();
}

function renderSessionCard() {
  const session = state.session;
  const card = session.current;
  const flashcardInner = document.getElementById('flashcardInner');
  flashcardInner.classList.remove('flipped');
  document.getElementById('flashcard').style.transform = '';
  document.getElementById('flashcard').style.transition = '';
  hideFlipBackCaption();

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

  updateProgressBar();
}

function updateProgressBar() {
  const session = state.session;
  const pct = Math.round((session.resolvedCount / session.total) * 100);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `Karte ${Math.min(session.resolvedCount + 1, session.total)} von ${session.total}`;
}

// Flip is a free toggle now (front<->back, as often as you like) and rating
// no longer depends on having flipped at all. Flipping *back* from the
// answer to the question side additionally shows a small teasing one-liner
// underneath the card (see loadFlipQuotes / showFlipBackCaption).
function toggleSessionFlip() {
  if (!state.session) return;
  const inner = document.getElementById('flashcardInner');
  const wasFlipped = inner.classList.contains('flipped');
  inner.classList.toggle('flipped');
  if (wasFlipped) showFlipBackCaption(); else hideFlipBackCaption();
}

function showFlipBackCaption() {
  const el = document.getElementById('flipBackCaption');
  const quotes = state.flipQuotes;
  if (!quotes || !quotes.length) { el.style.display = 'none'; return; }
  const q = quotes[Math.floor(Math.random() * quotes.length)];
  el.textContent = q.attribution ? `${q.text} — ${q.attribution}` : q.text;
  el.style.display = 'block';
}
function hideFlipBackCaption() {
  document.getElementById('flipBackCaption').style.display = 'none';
}

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
document.getElementById('imageModalBg').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

document.getElementById('btnYes').addEventListener('click', () => rateCard('yes'));
document.getElementById('btnNo').addEventListener('click', () => rateCard('no'));
document.getElementById('btnLater').addEventListener('click', () => rateCard('later'));

// ---------- Tap-to-flip & swipe-to-rate, unified into one pointer handler ----------
// Mouse and touch are both handled the same way here on purpose: relying on
// a separate native "click" listener alongside pointer-capture-based drag
// tracking is unreliable on desktop (browsers can suppress the synthesized
// click while a pointer is captured), so a small, unmoved pointer press is
// treated as "flip" directly, instead of waiting for a click event.
// "Später" is deliberately button/keyboard-only, never a swipe gesture.
(function setupSessionSwipe() {
  const flashcard = document.getElementById('flashcard');
  let dragging = false, startX = 0, dx = 0;
  const TAP_THRESHOLD = 6;
  const RATE_THRESHOLD = 90;

  flashcard.addEventListener('pointerdown', e => {
    if (!state.session) return;
    if (e.target.closest('.more-btn, .card-image')) return; // let those handle their own clicks
    dragging = true; startX = e.clientX; dx = 0;
    flashcard.setPointerCapture(e.pointerId);
    flashcard.style.transition = 'none';
  });
  flashcard.addEventListener('pointermove', e => {
    if (!dragging) return;
    dx = e.clientX - startX;
    flashcard.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    flashcard.style.transition = '';
    flashcard.style.transform = '';
    if (Math.abs(dx) < TAP_THRESHOLD) {
      toggleSessionFlip();
    } else if (dx > RATE_THRESHOLD) {
      rateCard('yes');
    } else if (dx < -RATE_THRESHOLD) {
      rateCard('no');
    }
    dx = 0;
  }
  flashcard.addEventListener('pointerup', endDrag);
  flashcard.addEventListener('pointercancel', endDrag);
})();

function rateCard(result) {
  const session = state.session;
  const card = session.current;
  const cp = getCardProgress(card.id);
  const isLateNight = new Date().getHours() >= 22;

  if (result === 'later') {
    session.stats.later++;
    session.queue.push(card); // goes to the back of the same session's queue
    showNextCard();
    return;
  }

  session.resolvedCount++;
  cp.seen++;
  session.results[card.id] = result;
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

  updateProgressBar();
  if (session.queue.length === 0) {
    // let the progress bar's CSS transition actually reach 100% before
    // switching to the summary screen, instead of jumping there instantly
    setTimeout(finishSession, 350);
  } else {
    showNextCard();
  }
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
  document.getElementById('summaryReviewList').style.display = 'none';
  document.getElementById('summaryReviewList').innerHTML = '';
  document.getElementById('btnReviewAnswers').textContent = 'Antworten nochmal anschauen';
  showScreen('screen-summary', { canGoBack: true, title: 'Fertig' });
}

document.getElementById('btnReviewAnswers').addEventListener('click', () => {
  const listEl = document.getElementById('summaryReviewList');
  const btn = document.getElementById('btnReviewAnswers');
  const session = state.session;
  const opening = listEl.style.display === 'none';
  if (opening && !listEl.childElementCount) {
    session.initialOrder.forEach(id => {
      const card = session.cardsById[id];
      const result = session.results[id];
      const row = document.createElement('button');
      row.className = 'review-item';
      row.innerHTML = `<span class="dot ${result === 'yes' ? 'correct' : 'wrong'}"></span><span class="q">${card.question}</span>`;
      row.addEventListener('click', () => openReviewCard(card));
      listEl.appendChild(row);
    });
  }
  listEl.style.display = opening ? 'flex' : 'none';
  btn.textContent = opening ? 'Antworten ausblenden' : 'Antworten nochmal anschauen';
});

function openReviewCard(card) {
  document.getElementById('reviewFlashcardInner').classList.remove('flipped');
  document.getElementById('reviewCardSectionLabel').textContent = `Kapitel ${card.chapterNumber}${card.section ? ' · ' + card.section : ''}`;
  document.getElementById('reviewCardQuestion').textContent = card.question;
  const img = document.getElementById('reviewCardImage');
  if (card.images && card.images.length) { img.src = 'images/' + card.images[0]; img.style.display = 'block'; }
  else { img.style.display = 'none'; }
  document.getElementById('reviewAnswerSimple').textContent = card.answerSimple || '';
  document.getElementById('reviewAnswerDetail').textContent = card.answerDetail || '';
  const extraBlock = document.getElementById('reviewAnswerExtraBlock');
  if (card.extra) { document.getElementById('reviewAnswerExtra').textContent = card.extra; extraBlock.style.display = 'block'; }
  else { extraBlock.style.display = 'none'; }
  document.getElementById('reviewModalBg').classList.add('open');
}
document.getElementById('reviewFlashcardInner').addEventListener('click', () => {
  document.getElementById('reviewFlashcardInner').classList.toggle('flipped');
});
document.getElementById('closeReviewModal').addEventListener('click', () => {
  document.getElementById('reviewModalBg').classList.remove('open');
});
document.getElementById('reviewModalBg').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

// "Zurück zu Brainfood" collapses the chapters->session->summary chain out
// of the browser history instead of stacking a fresh "screen-home" on top
// of it (which used to make the back arrow land on the finished summary
// screen again instead of the book list).
document.getElementById('btnSummaryHome').addEventListener('click', () => {
  goBackTo('screen-home', renderHome);
});

// ============================================================
// Catalog / Karteikartenbox
// ============================================================
let catalogAllCards = null;
let catalogFilterPart = null;
let catalogFiltered = [];
let catalogView = 'cards'; // default view, per spec
let catalogIndex = 0;

async function renderCatalog() {
  showScreen('screen-catalog', { canGoBack: true, title: 'Karteikartenbox' });
  if (!catalogAllCards) {
    const chapters = await loadAllChapters(state.currentBook);
    catalogAllCards = [];
    chapters.forEach(chData => {
      chData.cards.forEach(card => catalogAllCards.push(Object.assign({}, card, {
        chapterNumber: chData.chapter, chapterTitle: chData.title, part: chData.part
      })));
    });
  }
  catalogView = 'cards';
  catalogIndex = 0;
  document.querySelectorAll('#catalogViewToggle .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.view === catalogView));
  renderCatalogFilters();
  applyCatalogFilter(document.getElementById('catalogSearch').value);
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
      applyCatalogFilter(document.getElementById('catalogSearch').value);
    });
    row.appendChild(chip);
  });
}

// Search & part filter are shared between the list view and the card view.
function applyCatalogFilter(query) {
  const q = (query || '').toLowerCase().trim();
  catalogFiltered = catalogAllCards.filter(c => {
    if (catalogFilterPart !== null && c.part !== catalogFilterPart) return false;
    if (!q) return true;
    return (c.question + ' ' + c.answerSimple).toLowerCase().includes(q);
  });
  catalogIndex = 0;
  renderCatalogList();
  renderCatalogCard();
}
document.getElementById('catalogSearch').addEventListener('input', e => applyCatalogFilter(e.target.value));

document.getElementById('catalogViewToggle').addEventListener('click', e => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  catalogView = btn.dataset.view;
  document.querySelectorAll('#catalogViewToggle .seg-btn').forEach(b => b.classList.toggle('active', b === btn));
  document.getElementById('catalogListView').style.display = catalogView === 'list' ? 'flex' : 'none';
  document.getElementById('catalogCardView').style.display = catalogView === 'cards' ? 'block' : 'none';
  if (catalogView === 'cards') renderCatalogCard();
});

document.getElementById('catalogAddBtn').addEventListener('click', () => {
  showToast('Diese Funktion ist noch nicht verfügbar.');
});

// ---------- List view ----------
function renderCatalogList() {
  const list = document.getElementById('catalogListView');
  list.style.display = catalogView === 'list' ? 'flex' : 'none';
  list.innerHTML = '';
  if (!catalogFiltered.length) { list.innerHTML = `<p class="hint">${t('noCards')}</p>`; return; }
  catalogFiltered.forEach(c => {
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

// ---------- Card view (browse & flip, no rating) ----------
function renderCatalogCard() {
  const cardView = document.getElementById('catalogCardView');
  cardView.style.display = catalogView === 'cards' ? 'block' : 'none';
  if (!catalogFiltered.length) {
    document.getElementById('catalogCardPosition').textContent = t('noCards');
    document.getElementById('catalogCardQuestion').textContent = '';
    document.getElementById('catalogAnswerSimple').textContent = '';
    document.getElementById('catalogAnswerDetail').textContent = '';
    return;
  }
  if (catalogIndex >= catalogFiltered.length) catalogIndex = catalogFiltered.length - 1;
  if (catalogIndex < 0) catalogIndex = 0;
  const card = catalogFiltered[catalogIndex];

  document.getElementById('catalogFlashcardInner').classList.remove('flipped');
  document.getElementById('catalogFlashcard').style.transform = '';
  document.getElementById('catalogCardPosition').textContent = `Karte ${catalogIndex + 1} von ${catalogFiltered.length}`;
  document.getElementById('catalogCardSectionLabel').textContent = `Kapitel ${card.chapterNumber}${card.section ? ' · ' + card.section : ''}`;
  document.getElementById('catalogCardQuestion').textContent = card.question;

  const img = document.getElementById('catalogCardImage');
  if (card.images && card.images.length) { img.src = 'images/' + card.images[0]; img.style.display = 'block'; }
  else { img.style.display = 'none'; }

  document.getElementById('catalogAnswerSimple').textContent = card.answerSimple || '';
  document.getElementById('catalogAnswerDetail').textContent = card.answerDetail || '';
  const extraBlock = document.getElementById('catalogAnswerExtraBlock');
  if (card.extra) { document.getElementById('catalogAnswerExtra').textContent = card.extra; extraBlock.style.display = 'block'; }
  else { extraBlock.style.display = 'none'; }
}

function toggleCatalogFlip() {
  document.getElementById('catalogFlashcardInner').classList.toggle('flipped');
}
document.getElementById('catalogCardImage').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('modalImage').src = e.target.src;
  document.getElementById('imageModalBg').classList.add('open');
});

function catalogFirst() { if (catalogFiltered.length) { catalogIndex = 0; renderCatalogCard(); } }
function catalogPrev() { if (catalogIndex > 0) { catalogIndex--; renderCatalogCard(); } }
function catalogNext() { if (catalogIndex < catalogFiltered.length - 1) { catalogIndex++; renderCatalogCard(); } }
function catalogLast() { if (catalogFiltered.length) { catalogIndex = catalogFiltered.length - 1; renderCatalogCard(); } }
document.getElementById('catalogFirstBtn').addEventListener('click', catalogFirst);
document.getElementById('catalogPrevBtn').addEventListener('click', catalogPrev);
document.getElementById('catalogNextBtn').addEventListener('click', catalogNext);
document.getElementById('catalogLastBtn').addEventListener('click', catalogLast);
document.getElementById('catalogFirstBtn').innerHTML = icon('skipFirst');
document.getElementById('catalogPrevBtn').innerHTML = icon('arrowLeft');
document.getElementById('catalogNextBtn').innerHTML = icon('arrowRight');
document.getElementById('catalogLastBtn').innerHTML = icon('skipLast');

// Tap-to-flip & swipe-to-navigate, unified into one pointer handler for the
// same reason as the session card (see setupSessionSwipe above): a separate
// native "click" listener next to pointer-capture-based dragging is
// unreliable with a mouse.
(function setupCatalogSwipe() {
  const flashcard = document.getElementById('catalogFlashcard');
  let dragging = false, startX = 0, dx = 0;
  const TAP_THRESHOLD = 6;
  const NAV_THRESHOLD = 70;

  flashcard.addEventListener('pointerdown', e => {
    if (e.target.closest('.card-image')) return;
    dragging = true; startX = e.clientX; dx = 0;
    flashcard.setPointerCapture(e.pointerId);
    flashcard.style.transition = 'none';
  });
  flashcard.addEventListener('pointermove', e => {
    if (!dragging) return;
    dx = e.clientX - startX;
    flashcard.style.transform = `translateX(${dx}px)`;
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    flashcard.style.transition = '';
    flashcard.style.transform = '';
    if (Math.abs(dx) < TAP_THRESHOLD) {
      toggleCatalogFlip();
    } else if (dx < -NAV_THRESHOLD) {
      catalogNext();
    } else if (dx > NAV_THRESHOLD) {
      catalogPrev();
    }
    dx = 0;
  }
  flashcard.addEventListener('pointerup', endDrag);
  flashcard.addEventListener('pointercancel', endDrag);
})();

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
document.getElementById('backBtn').innerHTML = icon('arrowLeft');
document.getElementById('btnStartLearning').addEventListener('click', () => {
  state.chapterMode = 'next';
  state.selectedChapters = [];
  state.selectedParts = [];
  state.chapterSessionSize = settings.sessionSize;
  renderChapterSelect();
});
document.getElementById('btnCatalog').addEventListener('click', renderCatalog);
document.getElementById('btnAchievements').addEventListener('click', renderAchievements);
document.getElementById('settingsToggle').addEventListener('click', renderSettings);
document.getElementById('settingsToggle').innerHTML = icon('gear');

const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  settings.theme = theme;
  saveSettings();
  themeToggle.innerHTML = icon(theme === 'dark' ? 'moon' : 'sun');
}
setTheme(settings.theme || 'dark');
themeToggle.addEventListener('click', () => setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

const fullscreenToggle = document.getElementById('fullscreenToggle');
function updateFullscreenIcon() {
  fullscreenToggle.innerHTML = icon(document.fullscreenElement ? 'fullscreenOff' : 'fullscreenOn');
}
updateFullscreenIcon();
document.addEventListener('fullscreenchange', updateFullscreenIcon);
fullscreenToggle.addEventListener('click', () => {
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

// ============================================================
// Keyboard controls for flashcards
// ============================================================
// Session: ArrowLeft/A = kann ich nicht, ArrowRight/D = weiß ich,
//          ArrowUp/ArrowDown/W/S = flip, Space = später.
// Karteikartenbox (card view): ArrowLeft/A = vorherige Karte,
//          ArrowRight/D = nächste Karte, ArrowUp/ArrowDown/W/S = flip.
// Ignored while typing in a text field (e.g. the catalog search box).
document.addEventListener('keydown', e => {
  const activeTag = document.activeElement && document.activeElement.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

  const key = e.key.toLowerCase();
  const sessionActive = document.getElementById('screen-session').classList.contains('active');
  const catalogActive = document.getElementById('screen-catalog').classList.contains('active');

  if (sessionActive && state.session) {
    if (key === 'arrowleft' || key === 'a') { e.preventDefault(); rateCard('no'); }
    else if (key === 'arrowright' || key === 'd') { e.preventDefault(); rateCard('yes'); }
    else if (['arrowup', 'arrowdown', 'w', 's'].includes(key)) { e.preventDefault(); toggleSessionFlip(); }
    else if (key === ' ') { e.preventDefault(); rateCard('later'); }
  } else if (catalogActive && catalogView === 'cards') {
    if (key === 'arrowleft' || key === 'a') { e.preventDefault(); catalogPrev(); }
    else if (key === 'arrowright' || key === 'd') { e.preventDefault(); catalogNext(); }
    else if (['arrowup', 'arrowdown', 'w', 's'].includes(key)) { e.preventDefault(); toggleCatalogFlip(); }
  }
});

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
renderWelcome();
loadFlipQuotes(); // warm the cache early so the first flip-back has no delay
