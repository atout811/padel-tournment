import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WELCOME_COOLDOWN_MS, WELCOME_LAST_SHOWN_KEY, shouldShowWelcome, markWelcomeShown } from '../src/utils/storage.js';

const memoryStorage = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};

test('welcome appears once per hour without extending the cooldown on visits', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: memoryStorage(), sessionStorage: memoryStorage() };
  try {
    const start = 1_800_000_000_000;
    assert.equal(shouldShowWelcome(start), true);
    markWelcomeShown(start);
    for (const elapsed of [0, 500, 15 * 60 * 1000, WELCOME_COOLDOWN_MS - 1]) {
      assert.equal(shouldShowWelcome(start + elapsed), false);
      assert.equal(globalThis.window.localStorage.getItem(WELCOME_LAST_SHOWN_KEY), String(start));
    }
    assert.equal(shouldShowWelcome(start + WELCOME_COOLDOWN_MS), true);
    assert.equal(shouldShowWelcome(start + WELCOME_COOLDOWN_MS + 1), true);
    // A fresh tab retains the local cooldown even with empty session storage.
    globalThis.window.sessionStorage = memoryStorage();
    assert.equal(shouldShowWelcome(start + 2000), false);
  } finally { globalThis.window = previousWindow; }
});

test('welcome recovers from malformed or future timestamps', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage: memoryStorage(), sessionStorage: memoryStorage() };
  try {
    for (const value of ['broken', 'Infinity', '-1', '0', '1800000001000']) {
      globalThis.window.localStorage.setItem(WELCOME_LAST_SHOWN_KEY, value);
      assert.equal(shouldShowWelcome(1_800_000_000_000), true);
    }
  } finally { globalThis.window = previousWindow; }
});

test('blocked persistent storage falls back to session storage; blocked storage never throws', () => {
  const previousWindow = globalThis.window;
  const blocked = { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } };
  globalThis.window = { localStorage: blocked, sessionStorage: memoryStorage() };
  try {
    const start = 1_800_000_000_000;
    markWelcomeShown(start);
    assert.equal(shouldShowWelcome(start + 1), false);
    globalThis.window.sessionStorage = blocked;
    assert.doesNotThrow(() => markWelcomeShown(start));
    assert.equal(shouldShowWelcome(start), true);
  } finally { globalThis.window = previousWindow; }
});
