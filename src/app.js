import {
  el, loadWords, onWordsChanged, updateWord, renderSense, definitionStatus,
  filterWords, statsText, reviewOrder, exportCsv,
} from './common.js';

const $ = (id) => document.getElementById(id);
const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

let words = {};
let shown = [];
let selected = null;
let reviewQueue = [];
let reviewTotal = 0;

// The popup links to a specific word as app.html#<term>.
function selectFromHash() {
  const term = decodeURIComponent(location.hash.slice(1));
  if (!term) return;
  // Make sure the word isn't hidden by the current filter.
  if (words[term] && $('filter').value !== 'all' && words[term].status !== $('filter').value) $('filter').value = 'all';
  $('search').value = '';
  selected = term;
  showView('list');
  renderList();
  $('words').querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
}

async function load() {
  words = await loadWords();
  renderList();
  selectFromHash();
}

window.addEventListener('hashchange', selectFromHash);

onWordsChanged((next) => {
  words = next;
  renderList();
});

// ---- Word list (left) ----

function renderList() {
  shown = filterWords(words, { query: $('search').value, status: $('filter').value });
  if (!shown.some((w) => w.term === selected)) selected = shown[0]?.term ?? null;

  const list = $('words');
  list.replaceChildren();
  for (const w of shown) {
    const li = el('li', w.term === selected ? 'word selected' : 'word');
    const head = el('div', 'word-head');
    head.append(el('span', 'term', w.term), el('span', 'count', `${w.count}×`));
    li.append(head, el('p', 'preview', w.senses?.[0]?.def ?? ''));
    li.addEventListener('click', () => select(w.term));
    list.append(li);
  }

  $('empty').hidden = shown.length > 0;
  $('stats').textContent = statsText(words);
  renderDetail();
}

function select(term) {
  selected = term;
  for (const li of $('words').children) li.classList.toggle('selected', li.querySelector('.term').textContent === term);
  $('words').querySelector('.selected')?.scrollIntoView({ block: 'nearest' });
  renderDetail();
}

$('search').addEventListener('input', renderList);
$('filter').addEventListener('change', renderList);
$('export').addEventListener('click', () => exportCsv(words));

// ---- Word detail (right) ----

function renderDetail() {
  const detail = $('detail');
  detail.replaceChildren();
  const w = words[selected];
  if (!w) {
    detail.append(el('div', 'placeholder', 'Select a word to see its details.'));
    return;
  }

  const inner = el('div', 'detail-inner');
  const title = el('div', 'detail-title');
  title.append(el('h2', '', w.term));
  if (w.phonetic) title.append(el('span', 'phonetic', w.phonetic));
  title.append(el('span', 'pill', w.status === 'known' ? 'Known' : 'Learning'));
  inner.append(title);

  inner.append(el('p', 'meta',
    `Looked up ${w.count} ${w.count === 1 ? 'time' : 'times'} · first on ${dateFmt.format(w.firstSeen)} · last on ${dateFmt.format(w.lastSeen)}`));

  const actions = el('div', 'detail-actions');
  const toggle = el('button', 'primary', w.status === 'known' ? 'Back to learning' : 'Mark known');
  toggle.onclick = () => updateWord(w.term, { status: w.status === 'known' ? 'learning' : 'known' });
  const remove = el('button', '', 'Delete');
  remove.onclick = () => updateWord(w.term, null);
  const google = el('a', '', 'Search on Google ↗');
  google.href = `https://www.google.com/search?q=${encodeURIComponent(`${w.term} meaning`)}`;
  google.target = '_blank';
  actions.append(toggle, remove, google);
  inner.append(actions);

  const status = definitionStatus(w);
  if (status) inner.append(status);

  // Group senses by part of speech, keeping dictionary order.
  const groups = Map.groupBy(w.senses ?? [], (s) => s.pos);
  for (const [pos, senses] of groups) {
    const group = el('section', 'pos-group');
    group.append(el('h3', '', pos));
    const ol = el('ol');
    for (const s of senses) {
      const li = el('li', '', s.def);
      if (s.example) li.append(el('span', 'example', `“${s.example}”`));
      ol.append(li);
    }
    group.append(ol);
    inner.append(group);
  }

  if (w.synonyms?.length) {
    const syn = el('section', 'synonyms');
    syn.append(el('h3', '', 'Synonyms'));
    const chips = el('div', 'chips');
    chips.append(...w.synonyms.map((s) => el('span', 'chip', s)));
    syn.append(chips);
    inner.append(syn);
  }

  detail.append(inner);
}

// ---- Review (flashcards) ----

function startReview() {
  reviewQueue = reviewOrder(words);
  reviewTotal = reviewQueue.length;
  showCard();
}

function showCard() {
  const term = reviewQueue[0];
  const done = !term;
  $('card').hidden = done;
  $('review-hint').hidden = done;
  document.querySelector('.review-actions').hidden = done;
  $('review-empty').hidden = !done;
  $('progress').textContent = done ? '' : `${reviewQueue.length} of ${reviewTotal} ${reviewTotal === 1 ? 'word' : 'words'} left`;
  if (done) return;

  const word = words[term];
  $('card-front').textContent = term;
  const back = $('card-back');
  back.replaceChildren();
  if (word.phonetic) back.append(el('p', 'phonetic', word.phonetic));
  back.append(definitionStatus(word) ?? '', ...(word.senses ?? []).map(renderSense));
  back.hidden = true;
}

const flip = () => { $('card-back').hidden = !$('card-back').hidden; };
function again() {
  reviewQueue.push(reviewQueue.shift());
  showCard();
}
async function know() {
  const term = reviewQueue.shift();
  await updateWord(term, { status: 'known' });
  showCard();
}

$('card').addEventListener('click', flip);
$('again').addEventListener('click', again);
$('know').addEventListener('click', know);

// ---- Tabs + keyboard ----

let view = 'list';
function showView(name) {
  view = name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
  document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== name; });
  if (name === 'review') startReview();
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => showView(t.dataset.view)));

// Don't leave buttons focused, or Space would re-press the last one clicked.
document.addEventListener('click', (e) => e.target.closest?.('button')?.blur());

document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, select') || e.metaKey || e.ctrlKey || e.altKey) return;
  if (view === 'list' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    const i = shown.findIndex((w) => w.term === selected);
    const next = shown[Math.min(Math.max(i + (e.key === 'ArrowDown' ? 1 : -1), 0), shown.length - 1)];
    if (next) select(next.term);
  } else if (view === 'review' && reviewQueue.length) {
    if (e.key === ' ') { e.preventDefault(); flip(); }
    else if (e.key === '1') again();
    else if (e.key === '2') know();
  }
});

load();
