import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVED_PLAYER_NAMES_KEY, STORAGE_KEY, forgetPlayerName, loadSavedPlayerNames, rememberPlayerNames } from '../src/utils/storage.js';

test('forgetting names persists across history seeding and allows explicitly adding them again', () => {
  const data = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  try {
    data.set(STORAGE_KEY, JSON.stringify({ players: ['Ahmed', 'Omar'] }));
    rememberPlayerNames(['Ahmed', 'Ali']);
    assert.deepEqual(forgetPlayerName('AHMED'), ['Ali', 'Omar']);
    assert.deepEqual(loadSavedPlayerNames(), ['Ali', 'Omar']);
    assert.deepEqual(JSON.parse(data.get(STORAGE_KEY)).players, ['Ahmed', 'Omar']);
    assert.deepEqual(rememberPlayerNames(['ahmed']), ['ahmed', 'Ali', 'Omar']);
    assert.deepEqual(loadSavedPlayerNames(), JSON.parse(data.get(SAVED_PLAYER_NAMES_KEY)));
  } finally { globalThis.localStorage = previous; }
});
