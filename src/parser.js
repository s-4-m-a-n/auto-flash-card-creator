// Turns a search query into the vocabulary term being looked up, or null if
// the query isn't a "what does this word mean" search.

const PATTERNS = [
  /^(?:what is |what's )?(?:the )?(?:meaning|definition) of (?:the word )?(.+)$/,
  /^define:?\s+(.+)$/,
  /^what does (?:the word )?(.+?) mean$/,
  /^(.+?)(?: word)? (?:meaning|meanings|definition|defination|define|meaning in [a-z]+|meaning and examples?)$/,
];

// Queries that match a pattern but aren't vocabulary lookups ("life meaning").
const STOPLIST = new Set([
  'a', 'an', 'the', 'this', 'that', 'it', 'word', 'words', 'life', 'love', 'my name', 'name', 'dream', 'dreams',
]);

// One to three words of letters, apostrophes or hyphens.
const TERM = /^\p{L}[\p{L}'-]*(?: \p{L}[\p{L}'-]*){0,2}$/u;

export function extractTerm(query) {
  if (!query) return null;
  const q = query
    .toLowerCase()
    .replace(/[“”"?!.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const pattern of PATTERNS) {
    const match = q.match(pattern);
    if (!match) continue;
    const term = match[1].replace(/^['‘’]+|['‘’]+$/g, '').trim();
    if (term.length <= 40 && TERM.test(term) && !STOPLIST.has(term)) return term;
    return null;
  }
  return null;
}
