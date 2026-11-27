import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickRandomWord } from '../src/cards.js';

const words = {
  a: { term: 'a', count: 1, status: 'learning' },
  b: { term: 'b', count: 3, status: 'learning' },
  c: { term: 'c', count: 5, status: 'known' },
};

test('returns null when nothing is being learned', () => {
  assert.equal(pickRandomWord({}), null);
  assert.equal(pickRandomWord({ c: words.c }), null);
});

test('never picks known words', () => {
  for (let i = 0; i < 200; i++) assert.notEqual(pickRandomWord(words), 'c');
});

test('weights by lookup count', () => {
  // total weight 4: rolls below 1 pick "a", the rest pick "b"
  assert.equal(pickRandomWord(words, null, () => 0.2), 'a');
  assert.equal(pickRandomWord(words, null, () => 0.3), 'b');
  assert.equal(pickRandomWord(words, null, () => 0.999), 'b');
});

test('avoids repeating the last word unless it is the only one', () => {
  for (let i = 0; i < 100; i++) assert.equal(pickRandomWord(words, 'b'), 'a');
  assert.equal(pickRandomWord({ a: words.a }, 'a'), 'a');
});
