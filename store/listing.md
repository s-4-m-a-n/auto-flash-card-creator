# Chrome Web Store submission

Copy-paste text for each field in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
Upload package: run `npm run package` and upload `dist/vocab-tracker-<version>.zip`.

---

## Store listing tab

**Name** (from manifest): Vocab Tracker

**Summary** (from manifest, 123/132 chars):
Automatically collects words you look up on Google ("<word> meaning", "define <word>", ...) and turns them into flashcards.

**Category:** Education
**Language:** English

**Description:**

```
Look up a word, and it's saved for you as a flashcard. No copying and pasting, no "add word" button.

Vocab Tracker notices when you search Google for a word's meaning, from the address bar or google.com, and quietly adds that word to your list with its definition. If you search the same word again, it knows the word hasn't stuck yet and moves it back to the front of your review pile.

HOW IT WORKS
• Search the way you already do: "ubiquitous meaning", "define ephemeral", "what does laconic mean", "meaning of quixotic", "serendipity meaning in hindi"
• The word is saved automatically with its pronunciation, definitions, examples and synonyms
• Ordinary searches are ignored, and only "what does this word mean" searches are saved

FEATURES
• Popup: a compact list of your words with their main definition. Click a word to see more.
• Full-page view: every definition grouped by part of speech, with examples, synonyms and how often you've looked the word up
• Flashcard review: your most-looked-up words come first. Keyboard shortcuts: Space to flip, 1 for "again", 2 for "I know it".
• Toolbar badge shows how many words you're still learning
• Export your list as a CSV file

PRIVATE BY DESIGN
• Your word list stays on your computer. No account, no sync, no analytics, no ads.
• The only thing sent anywhere is the word itself, to the free Dictionary API (dictionaryapi.dev), to fetch its definition.
• Open source: https://github.com/s-4-m-a-n/auto-flash-card-creator
```

**Graphic assets** (all in this folder):

| Field | File |
|---|---|
| Store icon (128×128) | `icon-store-128.png` |
| Screenshots (1280×800) | `screenshot-1-popup.png`, `screenshot-2-full-view.png`, `screenshot-3-review.png` |
| Small promo tile (440×280) | `promo-small-440x280.png` |

**Homepage URL:** https://github.com/s-4-m-a-n/auto-flash-card-creator
**Support URL:** https://github.com/s-4-m-a-n/auto-flash-card-creator/issues

---

## Privacy practices tab

**Single purpose:**

```
Saves the words a user looks up on Google (searches like "<word> meaning" or "define <word>") to a local word list with their definitions, so the user can review them as flashcards.
```

**Permission justifications:**

`webNavigation`
```
Used to read the address of Google search result pages (google.<domain>/search) as they load, so the extension can see the search query and detect when the user is looking up a word's meaning. The listener is filtered to Google search URLs only. Other pages are never inspected, and nothing is stored unless the query is a word-meaning lookup.
```

`storage`
```
Stores the user's word list (words, definitions, lookup counts and learning status) locally in chrome.storage.local so it persists between browser sessions.
```

Host permission `https://api.dictionaryapi.dev/*`
```
Fetches the definition, pronunciation, examples and synonyms of a looked-up word from the free Dictionary API. Only the word itself is sent.
```

**Remote code:** No, I am not using remote code.

**Data usage**, what to tick:

- [x] **Web history**: the extension reads Google search URLs and stores the looked-up words with timestamps (locally only).
- Leave all other categories unticked.

Certify all three:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://github.com/s-4-m-a-n/auto-flash-card-creator/blob/main/PRIVACY.md

---

## Distribution tab

- **Visibility:** Public (or Unlisted to share by link first)
- **Regions:** All regions
- **Pricing:** Free

## Test instructions (optional, helps the reviewer)

```
No login needed. After installing, search Google for "ubiquitous meaning" (from the address bar or google.com). Click the toolbar icon: the word appears with its definition. Click ↗ for the full-page view, or "Review" for flashcards.
```
