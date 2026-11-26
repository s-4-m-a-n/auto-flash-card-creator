import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractTerm } from '../src/parser.js';

const cases = {
  'ubiquitous meaning': 'ubiquitous',
  'Ubiquitous   Meaning': 'ubiquitous',
  'serendipity meaning in hindi': 'serendipity',
  'ephemeral definition': 'ephemeral',
  'ephemeral word meaning': 'ephemeral',
  'meaning of obfuscate': 'obfuscate',
  'what is the meaning of quixotic?': 'quixotic',
  'definition of laissez-faire': 'laissez-faire',
  'define: sonder': 'sonder',
  'define petrichor': 'petrichor',
  'what does "zeitgeist" mean': 'zeitgeist',
  'raison d\'être meaning': 'raison d\'être',
  'carpe diem meaning': 'carpe diem',
  'meaning of life': null,
  'weather tomorrow': null,
  'how to define a function in python meaning': null,
  'javascript array map': null,
  '': null,
};

for (const [query, expected] of Object.entries(cases)) {
  test(`${JSON.stringify(query)} -> ${expected}`, () => {
    assert.equal(extractTerm(query), expected);
  });
}
