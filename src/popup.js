import {
  el, loadWords, onWordsChanged, updateWord, renderSense, definitionStatus,
  filterWords, statsText, reviewOrder, exportCsv,
} from './common.js';

const $ = (id) => document.getElementById(id);

// The popup is small; anything beyond this lives in the full-page view.
const EXPANDED_SENSES = 3;

let words = {};
let expanded = null;
let reviewQueue = [];

async function load() {
  words = await loadWords();
  renderList();
}

onWordsChanged((next) => {
  words = next;
  renderList();
});

// ---- Word list (compact: first definition only, click to expand) ----

function renderList() {
  const shown = filterWords(words, { query: $('search').value, status: $('filter').value });

  const list = $('words');
  list.replaceChildren();
  for (const w of shown) {
    const isOpen = w.term === expanded;
    const li = el('li', isOpen ? 'word open' : 'word');
    const head = el('div', 'word-head');
    head.append(el('span', 'term', w.term));
    if (w.phonetic) head.append(el('span', 'phonetic', w.phonetic));
    head.append(el('span', 'count', `${w.count}×`));
    li.append(head);

    const status = definitionStatus(w);
    if (status) li.append(status);
    const senseCount = w.senses?.length ?? 0;
    const visible = isOpen ? EXPANDED_SENSES : 1;
    for (const s of (w.senses ?? []).slice(0, visible)) li.append(renderSense(s));

    if (isOpen) {
      const actions = el('div', 'word-actions');
      const toggle = el('button', '', w.status === 'known' ? 'Back to learning' : 'Mark known');
      toggle.onclick = () => updateWord(w.term, { status: w.status === 'known' ? 'learning' : 'known' });
      const remove = el('button', '', 'Delete');
      remove.onclick = () => updateWord(w.term, null);
      const full = el('button', '', senseCount > visible ? `See all ${senseCount} in full view ↗` : 'Full view ↗');
      full.onclick = () => openFullView(w.term);
      actions.append(toggle, remove, full);
      li.append(actions);
    } else if (senseCount > 1) {
      li.append(el('p', 'more', `+${senseCount - 1} more`));
    }

    li.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      expanded = isOpen ? null : w.term;
      renderList();
    });
    list.append(li);
  }

  $('empty').hidden = Object.keys(words).length > 0;
  $('stats').textContent = statsText(words);
}

$('search').addEventListener('input', renderList);
$('filter').addEventListener('change', renderList);
$('export').addEventListener('click', () => exportCsv(words));

// ---- Full-page view: focus the existing tab if one is open ----

async function openFullView(term) {
  const base = chrome.runtime.getURL('src/app.html');
  const url = term ? `${base}#${encodeURIComponent(term)}` : base;
  const tabs = await chrome.runtime.getContexts({ contextTypes: ['TAB'] });
  const existing = tabs.find((c) => c.documentUrl?.startsWith(base));
  if (existing) {
    await chrome.tabs.update(existing.tabId, { active: true, ...(term && { url }) });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
  window.close();
}

$('open-full').addEventListener('click', () => openFullView(expanded));
$('open-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());

// ---- Review (flashcards) ----

function startReview() {
  reviewQueue = reviewOrder(words);
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
  back.append(definitionStatus(word) ?? '', ...(word.senses ?? []).slice(0, 2).map(renderSense));
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
