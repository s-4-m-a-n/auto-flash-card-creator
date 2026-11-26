import { extractTerm } from './parser.js';

const SEARCH_FILTER = { url: [{ hostContains: 'google.', pathEquals: '/search' }] };
const GOOGLE_HOST = /(^|\.)google\.[a-z.]+$/;
// Google re-fires history updates when switching result tabs (Images, News...),
// so ignore the same term in the same tab for a while.
const REPEAT_WINDOW_MS = 10 * 60 * 1000;

const lastSeenByTab = new Map();

chrome.webNavigation.onCommitted.addListener(onSearch, SEARCH_FILTER);
chrome.webNavigation.onHistoryStateUpdated.addListener(onSearch, SEARCH_FILTER);
chrome.tabs.onRemoved.addListener((tabId) => lastSeenByTab.delete(tabId));
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.runtime.onInstalled.addListener(() => {
  refreshBadge();
  backfillDefinitions();
});

function onSearch({ tabId, frameId, url }) {
  if (frameId !== 0) return;
  const parsed = new URL(url);
  if (!GOOGLE_HOST.test(parsed.hostname)) return;

  const term = extractTerm(parsed.searchParams.get('q'));
  if (!term) return;

  const last = lastSeenByTab.get(tabId);
  if (last && last.term === term && Date.now() - last.at < REPEAT_WINDOW_MS) return;
  lastSeenByTab.set(tabId, { term, at: Date.now() });

  enqueue(() => recordLookup(term));
}

// Serialize storage read-modify-write so concurrent searches don't clobber each other.
let queue = Promise.resolve();
function enqueue(task) {
  queue = queue.then(task).catch((err) => console.error('[vocab]', err));
  return queue;
}

async function recordLookup(term) {
  const { words = {} } = await chrome.storage.local.get('words');
  const now = Date.now();
  const entry = words[term] ?? { term, count: 0, firstSeen: now, status: 'learning', phonetic: '', senses: null };
  entry.count += 1;
  entry.lastSeen = now;
  // Looking a word up again means you don't know it yet.
  entry.status = 'learning';
  words[term] = entry;
  await chrome.storage.local.set({ words });

  if (entry.senses === null) fetchDefinition(term);
}

async function fetchDefinition(term) {
  let phonetic = '';
  let senses;
  let synonyms = [];
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`);
    if (res.status === 404) {
      senses = [];
    } else if (!res.ok) {
      return; // leave senses null so the next lookup retries
    } else {
      const entries = await res.json();
      phonetic = entries.find((e) => e.phonetic)?.phonetic
        ?? entries.flatMap((e) => e.phonetics ?? []).find((p) => p.text)?.text
        ?? '';
      const meanings = entries.flatMap((e) => e.meanings);
      senses = meanings
        .flatMap((m) => m.definitions.slice(0, 3).map((d) => ({ pos: m.partOfSpeech, def: d.definition, example: d.example ?? '' })))
        .slice(0, 10);
      synonyms = [...new Set(meanings.flatMap((m) => [...(m.synonyms ?? []), ...m.definitions.flatMap((d) => d.synonyms ?? [])]))]
        .slice(0, 12);
    }
  } catch {
    return; // offline; retry on next lookup
  }

  await enqueue(async () => {
    const { words = {} } = await chrome.storage.local.get('words');
    if (!words[term]) return; // deleted while fetching
    Object.assign(words[term], { phonetic, senses, synonyms });
    await chrome.storage.local.set({ words });
  });
}

// Words saved before synonyms were stored have only a few senses; fetch them again once.
async function backfillDefinitions() {
  const { words = {} } = await chrome.storage.local.get('words');
  for (const w of Object.values(words)) {
    if (w.senses !== null && !w.synonyms) await fetchDefinition(w.term);
  }
}

function updateBadge(words) {
  const learning = Object.values(words).filter((w) => w.status === 'learning').length;
  chrome.action.setBadgeText({ text: learning ? String(learning) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#3b6ef5' });
}

async function refreshBadge() {
  const { words = {} } = await chrome.storage.local.get('words');
  updateBadge(words);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.words) updateBadge(changes.words.newValue ?? {});
});
