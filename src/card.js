import { el, loadWords, updateWord, renderSense, definitionStatus } from './common.js';

const $ = (id) => document.getElementById(id);
const term = new URLSearchParams(location.search).get('term');

async function load() {
  const word = (await loadWords())[term];
  if (!word) {
    window.close(); // deleted since the card was opened
    return;
  }
  $('card-front').textContent = word.term;
  const back = $('card-back');
  if (word.phonetic) back.append(el('p', 'phonetic', word.phonetic));
  back.append(definitionStatus(word) ?? '', ...(word.senses ?? []).slice(0, 3).map(renderSense));
}

function flip() {
  $('card-back').hidden = !$('card-back').hidden;
  $('hint').hidden = true;
}

async function know() {
  await updateWord(term, { status: 'known' });
  window.close();
}

$('card').addEventListener('click', flip);
$('again').addEventListener('click', () => window.close());
$('know').addEventListener('click', know);

$('full').addEventListener('click', async (e) => {
  e.preventDefault();
  await chrome.tabs.create({ url: chrome.runtime.getURL(`src/app.html#${encodeURIComponent(term)}`) });
  window.close();
});
$('settings').addEventListener('click', async (e) => {
  e.preventDefault();
  await chrome.runtime.openOptionsPage();
  window.close();
});

document.addEventListener('click', (e) => e.target.closest?.('button')?.blur());
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === ' ') { e.preventDefault(); flip(); }
  else if (e.key === '1' || e.key === 'Escape') window.close();
  else if (e.key === '2') know();
});

load();
