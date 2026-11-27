// User settings, shared by the background worker and the settings page.

export const DEFAULT_SETTINGS = {
  cardsEnabled: true, // pop up random flashcards
  cardMode: 'anytime', // 'anytime': on a timer; 'idle': only after the user goes idle
  idleMinutes: 2, // how long without keyboard/mouse input counts as idle
  cooldownMinutes: 30, // timer interval ('anytime'), or minimum gap between cards ('idle')
};

export async function loadSettings() {
  const { settings = {} } = await chrome.storage.local.get('settings');
  // Settings saved before cardsEnabled existed used idleCards.
  const { idleCards, ...rest } = settings;
  return { ...DEFAULT_SETTINGS, ...(idleCards !== undefined && { cardsEnabled: idleCards }), ...rest };
}

export async function saveSettings(change) {
  await chrome.storage.local.set({ settings: { ...(await loadSettings()), ...change } });
}
