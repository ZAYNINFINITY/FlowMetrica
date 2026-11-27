import assert from 'node:assert/strict';
import test from 'node:test';

import { createUpstashRestClient } from './upstash.js';

function fakeFetch(responder) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return responder(url, options);
  };
  return { calls, fetchImpl };
}

test('REST commands authenticate and send the command array in the body', async () => {
  const { calls, fetchImpl } = fakeFetch(async () => ({
    ok: true,
    json: async () => ({ result: 'OK' }),
  }));
  const client = createUpstashRestClient({
    url: 'https://example.upstash.io/',
    token: 'rest-secret',
    fetchImpl,
  });

  const result = await client.command('SET', 'key', 'value', 'EX', 10);

  assert.equal(result, 'OK');
  assert.equal(calls[0].url, 'https://example.upstash.io');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer rest-secret');
  assert.deepEqual(JSON.parse(calls[0].options.body), ['SET', 'key', 'value', 'EX', 10]);
});

test('pipeline keeps per-command errors without failing the batch', async () => {
  const { fetchImpl } = fakeFetch(async () => ({
    ok: true,
    json: async () => [{ result: 'OK' }, { error: 'wrong type' }],
  }));
  const client = createUpstashRestClient({
    url: 'https://example.upstash.io',
    token: 'rest-secret',
    fetchImpl,
  });

  const rows = await client.pipeline([
    ['SET', 'a', 'b'],
    ['INCR', 'a'],
  ]);

  assert.deepEqual(rows, [{ result: 'OK' }, { error: 'wrong type' }]);
});

test('missing credentials fail closed', () => {
  assert.throws(
    () => createUpstashRestClient({ url: 'http://example.upstash.io', token: 'x' }),
    /HTTPS/,
  );
  assert.throws(
    () => createUpstashRestClient({ url: 'https://example.upstash.io', token: '' }),
    /token/i,
  );
});
