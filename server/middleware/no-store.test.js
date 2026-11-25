import assert from 'node:assert/strict';
import test from 'node:test';

import { noStore } from './no-store.js';

function fakeResponse() {
  const headers = new Map();
  return {
    headers,
    set: (name, value) => headers.set(name.toLowerCase(), value),
  };
}

test('API middleware forbids browser caching and continues the chain', () => {
  const response = fakeResponse();
  let nextCalled = false;

  noStore({}, response, () => {
    nextCalled = true;
  });

  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(nextCalled, true);
});
