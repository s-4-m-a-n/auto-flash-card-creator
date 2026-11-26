const $ = (id) => document.getElementById(id);

let words = {};
let reviewQueue = [];

async function load() {
  ({ words = {} } = await chrome.storage.local.get('words'));
  renderList();
}

async function updateWord(term, change) {
  const { words: current = {} } = await chrome.storage.local.get('words');
  if (change === null) delete current[term];
  else if (current[term]) Object.assign(current[term], change);
  await chrome.storage.local.set({ words: current });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.words) return;
  words = changes.words.newValue ?? {};
  renderList();
});

// ---- Word list ----

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderSenses(container, word) {
  if (word.senses === null) {
    container.append(el('p', 'sense muted', 'Fetching definition…'));
  } else if (word.senses.length === 0) {
    container.append(el('p', 'sense muted', 'No dictionary entry found.'));
  }
  for (const s of word.senses ?? []) {
    const p = el('p', 'sense');
    p.append(el('span', 'pos', `${s.pos} `), s.def);
    if (s.example) p.append(' ', el('span', 'example', `“${s.example}”`));
    container.append(p);
  }
}

function renderList() {
  const query = $('search').value.trim().toLowerCase();
  const filter = $('filter').value;
  const all = Object.values(words);
  const shown = all
    .filter((w) => filter === 'all' || w.status === filter)
    .filter((w) => w.term.includes(query))
    .sort((a, b) => b.lastSeen - a.lastSeen);

  const list = $('words');
  list.replaceChildren();
  for (const w of shown) {
    const li = el('li', 'word');
    const head = el('div', 'word-head');
    head.append(el('span', 'term', w.term));
    if (w.phonetic) head.append(el('span', 'phonetic', w.phonetic));
    head.append(el('span', 'count', `looked up ${w.count}×`));
    li.append(head);
    renderSenses(li, w);

    const actions = el('div', 'word-actions');
    const toggle = el('button', '', w.status === 'known' ? 'Back to learning' : 'Mark known');
    toggle.onclick = () => updateWord(w.term, { status: w.status === 'known' ? 'learning' : 'known' });
    const remove = el('button', '', 'Delete');
    remove.onclick = () => updateWord(w.term, null);
    actions.append(toggle, remove);
    li.append(actions);
    list.append(li);
  }

  $('empty').hidden = all.length > 0;
  const learning = all.filter((w) => w.status === 'learning').length;
  $('stats').textContent = all.length ? `${learning} learning · ${all.length - learning} known` : '';
}

$('search').addEventListener('input', renderList);
$('filter').addEventListener('change', renderList);

// ---- CSV export (front,back — imports directly into Anki) ----

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

$('export').addEventListener('click', () => {
  const rows = Object.values(words).map((w) => {
    const back = (w.senses ?? []).map((s) => `(${s.pos}) ${s.def}`).join('<br>');
    return [w.term, [w.phonetic, back].filter(Boolean).join('<br>')].map(csvCell).join(',');
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vocab-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---- Review (flashcards) ----

function startReview() {
  // Words you've looked up most often come first — they're the ones not sticking.
  reviewQueue = Object.values(words)
    .filter((w) => w.status === 'learning')
    .sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen)
    .map((w) => w.term);
  showCard();
}

function showCard() {
  const term = reviewQueue[0];
  const done = !term;
  $('card').hidden = done;
  $('review-hint').hidden = done;
  document.querySelector('.review-actions').hidden = done;
  $('review-empty').hidden = !done;
  if (done) return;

  const word = words[term];
  $('card-front').textContent = term;
  const back = $('card-back');
  back.replaceChildren();
  if (word.phonetic) back.append(el('p', 'phonetic', word.phonetic));
  renderSenses(back, word);
  back.hidden = true;
}

$('card').addEventListener('click', () => { $('card-back').hidden = !$('card-back').hidden; });
$('again').addEventListener('click', () => {
  reviewQueue.push(reviewQueue.shift());
  showCard();
});
$('know').addEventListener('click', async () => {
  const term = reviewQueue.shift();
  await updateWord(term, { status: 'known' });
  showCard();
});

// ---- Tabs ----

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== tab.dataset.view; });
    if (tab.dataset.view === 'review') startReview();
  });
}

load();
