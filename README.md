# Vocab Tracker (Chrome extension)

Collects the words you look up on Google and turns them into flashcards automatically.
Search `ubiquitous meaning` from the address bar or google.com, and the word is saved with its definition.

## What it detects

`<word> meaning`, `<word> meaning in <language>`, `<word> definition`, `<word> word meaning`,
`meaning of <word>`, `what is the meaning of <word>`, `define <word>`, `define: <word>`, `what does <word> mean`.
Terms can be 1–3 words (e.g. `carpe diem meaning`). Generic queries like `meaning of life` are ignored.

Looking up a word again bumps its count and moves it back to *Learning*.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.

## Use

- Toolbar badge = number of words still being learned.
- **Words** tab: definitions, lookup counts, mark known / delete.
- **Review** tab: flashcards, most-looked-up words first.
- **Export CSV (Anki)**: `front,back` file you can import straight into Anki.

Definitions come from the free [Dictionary API](https://dictionaryapi.dev). Everything is stored locally in `chrome.storage.local`.

## Tests

```
npm test
```
