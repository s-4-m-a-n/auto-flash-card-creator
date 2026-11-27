// Picks a random word to quiz, favouring words looked up more often (they're
// the ones not sticking) and avoiding showing the same word twice in a row.
export function pickRandomWord(words, exclude = null, random = Math.random) {
  let pool = Object.values(words).filter((w) => w.status === 'learning');
  if (pool.length > 1) pool = pool.filter((w) => w.term !== exclude);
  if (!pool.length) return null;

  const total = pool.reduce((sum, w) => sum + w.count, 0);
  let roll = random() * total;
  for (const w of pool) {
    roll -= w.count;
    if (roll < 0) return w.term;
  }
  return pool.at(-1).term;
}
