import { loadSettings, saveSettings } from './settings.js';
import { loadWords } from './common.js';

const $ = (id) => document.getElementById(id);

let settings;
let lastCardAt = 0;
let learningCount = 0;

function formatMinutes(minutes) {
  if (minutes < 1) return 'less than a minute';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

async function load() {
  settings = await loadSettings();
  ({ lastCardAt = 0 } = await chrome.storage.local.get('lastCardAt'));
  const words = Object.values(await loadWords());
  learningCount = words.filter((w) => w.status === 'learning').length;

  $('cardsEnabled').checked = settings.cardsEnabled;
  for (const group of document.querySelectorAll('.segmented')) {
    const value = String(settings[group.dataset.setting]);
    for (const input of group.querySelectorAll('input')) input.checked = input.value === value;
  }
  $('word-count').textContent = `${words.length} (${learningCount} learning, ${words.length - learningCount} known)`;
  $('version').textContent = chrome.runtime.getManifest().version;
  render();
}

function render() {
  const idleMode = settings.cardMode === 'idle';
  $('card-options').disabled = !settings.cardsEnabled;
  $('idle-field').hidden = !idleMode;
  $('cooldown-label').textContent = idleMode ? 'Show at most one card every' : 'Show a card every';
  renderStatus();
}

async function renderStatus() {
  const status = $('status');
  status.classList.toggle('on', settings.cardsEnabled);
  const minutesUntil = (time) => Math.max(0, Math.ceil((time - Date.now()) / 60000));

  if (!settings.cardsEnabled) {
    status.textContent = 'Off. No cards will pop up.';
  } else if (!learningCount) {
    status.textContent = 'On. Cards start once you look up a word on Google.';
  } else if (settings.cardMode === 'anytime') {
    const alarm = await chrome.alarms.get('flashcard');
    status.textContent = alarm ? `On. Next card in ${formatMinutes(minutesUntil(alarm.scheduledTime))}.` : 'On.';
  } else if (!lastCardAt) {
    status.textContent = `On. A card appears after ${formatMinutes(settings.idleMinutes)} idle.`;
  } else {
    const ago = Math.floor((Date.now() - lastCardAt) / 60000);
    const wait = settings.cooldownMinutes - ago;
    status.textContent = `Last card ${ago < 1 ? 'just now' : `${formatMinutes(ago)} ago`}. ` +
      (wait > 0 ? `Next one possible in ${formatMinutes(wait)}.` : 'Next one when you go idle.');
  }
}

let toastTimer;
function showToast(text) {
  const toast = $('toast');
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 1500);
}

async function update(change) {
  Object.assign(settings, change);
  render();
  await saveSettings(change);
  showToast('Saved');
  setTimeout(renderStatus, 300); // the background reschedules the timer after saving
}

$('cardsEnabled').addEventListener('change', () => update({ cardsEnabled: $('cardsEnabled').checked }));
for (const group of document.querySelectorAll('.segmented')) {
  group.addEventListener('change', (e) => {
    const value = e.target.value;
    update({ [group.dataset.setting]: Number.isNaN(Number(value)) ? value : Number(value) });
  });
}

$('test').addEventListener('click', () => {
  if (!learningCount) {
    showToast('No words to quiz yet');
    return;
  }
  chrome.runtime.sendMessage({ type: 'show-card' });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.settings || changes.words) {
    load(); // changed in another tab, or by the card window
  } else if (changes.lastCardAt) {
    lastCardAt = changes.lastCardAt.newValue ?? 0;
    renderStatus();
  }
});
setInterval(renderStatus, 30 * 1000); // keep "x minutes" current

load();
