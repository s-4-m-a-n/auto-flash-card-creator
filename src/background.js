import { extractTerm } from './parser.js';
import { loadSettings } from './settings.js';
import { pickRandomWord } from './cards.js';

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
  if (area !== 'local') return;
  if (changes.words) updateBadge(changes.words.newValue ?? {});
  if (changes.settings) applySchedule();
});

// ---- Flashcard pop-ups ----

const CARD_WIDTH = 460;
const CARD_HEIGHT = 500;
const CARD_ALARM = 'flashcard';

chrome.idle.onStateChanged.addListener((state) => {
  // Fires once per transition, so a long absence produces one card, not many.
  if (state === 'idle') maybeShowCard('idle');
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CARD_ALARM) maybeShowCard('anytime');
});
applySchedule();

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'show-card') showRandomCard();
});

async function applySchedule() {
  const settings = await loadSettings();
  chrome.idle.setDetectionInterval(settings.idleMinutes * 60);

  // Leave a matching alarm alone so a worker restart doesn't reset the timer.
  const alarm = await chrome.alarms.get(CARD_ALARM);
  if (settings.cardsEnabled && settings.cardMode === 'anytime') {
    if (alarm?.periodInMinutes !== settings.cooldownMinutes) {
      await chrome.alarms.create(CARD_ALARM, { periodInMinutes: settings.cooldownMinutes });
    }
  } else if (alarm) {
    await chrome.alarms.clear(CARD_ALARM);
  }
}

async function maybeShowCard(trigger) {
  const settings = await loadSettings();
  if (!settings.cardsEnabled || settings.cardMode !== trigger) return;

  // One minute of slack so a 30-minute timer isn't blocked by a card shown 29.9 minutes ago.
  const { lastCardAt = 0 } = await chrome.storage.local.get('lastCardAt');
  if (Date.now() - lastCardAt < (settings.cooldownMinutes - 1) * 60 * 1000) return;
  if (await isBusy()) return;

  if (await showRandomCard()) await chrome.storage.local.set({ lastCardAt: Date.now() });
}

// Don't interrupt a video, a fullscreen window, or a locked screen.
async function isBusy() {
  if ((await chrome.idle.queryState(15)) === 'locked') return true;
  const audible = await chrome.tabs.query({ active: true, audible: true });
  if (audible.length) return true;
  const focused = await chrome.windows.getLastFocused().catch(() => null);
  return focused?.state === 'fullscreen';
}

async function showRandomCard() {
  // One card at a time: if the last one is still open, leave it be.
  const { cardWindowId } = await chrome.storage.session.get('cardWindowId');
  if (cardWindowId != null && (await chrome.windows.get(cardWindowId).catch(() => null))) return false;

  const { words = {}, lastCardTerm } = await chrome.storage.local.get(['words', 'lastCardTerm']);
  const term = pickRandomWord(words, lastCardTerm);
  if (!term) return false;

  // Centre the card over the browser window when there is one.
  const anchor = await chrome.windows.getLastFocused().catch(() => null);
  const position = anchor?.width
    ? { left: Math.round(anchor.left + (anchor.width - CARD_WIDTH) / 2), top: Math.round(anchor.top + (anchor.height - CARD_HEIGHT) / 2) }
    : {};
  const win = await chrome.windows.create({
    url: chrome.runtime.getURL(`src/card.html?term=${encodeURIComponent(term)}`),
    type: 'popup',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    focused: true,
    ...position,
  });
  await chrome.storage.local.set({ lastCardTerm: term });
  await chrome.storage.session.set({ cardWindowId: win.id });
  return true;
}
