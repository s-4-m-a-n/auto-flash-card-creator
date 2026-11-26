// Shared by the popup and the full-page view.

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export async function loadWords() {
  const { words = {} } = await chrome.storage.local.get('words');
  return words;
}

export function onWordsChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.words) callback(changes.words.newValue ?? {});
  });
}

// change === null deletes the word.
export async function updateWord(term, change) {
  const words = await loadWords();
  if (change === null) delete words[term];
  else if (words[term]) Object.assign(words[term], change);
  await chrome.storage.local.set({ words });
}

export function renderSense(sense) {
  const p = el('p', 'sense');
  p.append(el('span', 'pos', `${sense.pos} `), sense.def);
  if (sense.example) p.append(' ', el('span', 'example', `“${sense.example}”`));
  return p;
}

// Placeholder for words whose definition is missing; null when there are senses to show.
export function definitionStatus(word) {
  if (word.senses === null) return el('p', 'sense muted', 'Fetching definition…');
  if (word.senses.length === 0) return el('p', 'sense muted', 'No dictionary entry found.');
  return null;
}

export function filterWords(words, { query = '', status = 'all' }) {
  return Object.values(words)
    .filter((w) => status === 'all' || w.status === status)
    .filter((w) => w.term.includes(query.trim().toLowerCase()))
    .sort((a, b) => b.lastSeen - a.lastSeen);
}

export function statsText(words) {
  const all = Object.values(words);
  const learning = all.filter((w) => w.status === 'learning').length;
  return all.length ? `${learning} learning · ${all.length - learning} known` : '';
}

// Words you've looked up most often come first — they're the ones not sticking.
export function reviewOrder(words) {
  return Object.values(words)
    .filter((w) => w.status === 'learning')
    .sort((a, b) => b.count - a.count || b.lastSeen - a.lastSeen)
    .map((w) => w.term);
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// front,back — imports directly into Anki.
export function exportCsv(words) {
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
}
