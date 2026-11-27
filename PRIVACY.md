# Vocab Tracker — Privacy Policy

_Last updated: November 27, 2026_

Vocab Tracker is a Chrome extension that saves the words you look up on Google so you can review them as flashcards. This policy explains what data it handles and where that data goes.

## What the extension reads

The extension watches the addresses of Google search pages you open (`google.<domain>/search?...`) in order to read the search query. It only acts on queries that ask for a word's meaning, such as `ubiquitous meaning`, `define ubiquitous` or `what does ubiquitous mean`. All other searches and all other pages are ignored and nothing about them is stored.

To decide when to pop up a flashcard, the extension also checks whether you are idle (no keyboard or mouse input for a few minutes) or your screen is locked, whether the active tab is playing sound, and whether a window is fullscreen. These checks are not recorded.

## What the extension stores

For each word you look up, the extension stores:

- the word itself
- how many times you looked it up, and when (first and last time)
- whether you marked it as "Learning" or "Known"
- its pronunciation, definitions, examples and synonyms

It also stores your settings, and which word was last shown as a flashcard pop-up and when.

This data is stored only on your computer, in Chrome's extension storage (`chrome.storage.local`). It is not synced to your Google account and is never sent to the developer. Uninstalling the extension deletes it.

## What is sent to third parties

To get a definition, the extension sends **only the word** (for example `ubiquitous`) to the free [Free Dictionary API](https://dictionaryapi.dev) at `api.dictionaryapi.dev`. No search query, browsing history, account information or other identifier is sent. That service's own privacy practices apply to the request.

Nothing else leaves your computer. The extension has no analytics, no ads, no tracking and no server of its own.

## What the extension does not do

- It does not sell or share your data.
- It does not use your data for anything other than the word list and flashcards.
- It does not use your data to determine creditworthiness or for lending purposes.
- It does not read page content, passwords, form inputs or any website other than Google search addresses.

## Exporting and deleting your data

You can export your word list as a CSV file at any time from the extension. You can delete individual words in the extension, or delete everything by removing the extension.

## Changes

If this policy changes, the updated version will be published at this address with a new "Last updated" date.

## Contact

Questions or concerns: open an issue at <https://github.com/s-4-m-a-n/auto-flash-card-creator/issues>.
