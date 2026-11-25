import assert from 'node:assert/strict';
import test from 'node:test';

import { createMeasurementStore, normalizeMeasurement } from './measurement.js';

const ooklaResult = {
  client: { isp: 'Example ISP', country: 'PK' },
  pingResult: { latency: 15.34, jitter: 2.16 },
  downloadResult: { speed: 94.56 },
  uploadResult: { speed: 88.24 },
  bestServer: { name: 'Lahore', country: 'Pakistan', sponsor: 'PTCL' },
};

test('normalises the documented Ookla result shape', () => {
  const value = normalizeMeasurement(ooklaResult, '2026-11-25T10:00:00.000Z');
  assert.equal(value.downloadMbps, 94.56);
  assert.equal(value.uploadMbps, 88.24);
  assert.equal(value.pingMs, 15.3);
  assert.equal(value.jitterMs, 2.2);
  assert.equal(value.isp, 'Example ISP');
  assert.equal(value.server.name, 'Lahore');
});

test('also accepts a simple measurement shape', () => {
  const value = normalizeMeasurement({ download: 12.345, upload: 6.789, ping: 20 }, 'now');
  assert.equal(value.downloadMbps, 12.35);
  assert.equal(value.uploadMbps, 6.79);
  assert.equal(value.pingMs, 20);
});

test('refuses to invent numbers for a missing measurement', () => {
  assert.throws(() => normalizeMeasurement({}, 'now'), {
    code: 'MEASUREMENT_INVALID_RESULT',
  });
});

test('store returns a server-owned id and hides expiry metadata', async () => {
  const store = createMeasurementStore({
    runner: async () => ooklaResult,
    now: () => '2026-11-25T10:00:00.000Z',
    generateId: () => 'measurement-001',
  });
  const saved = await store.run();
  assert.equal(saved.id, 'measurement-001');
  assert.equal(store.isAvailable(), true);

  const fetched = store.get('measurement-001');
  assert.equal(fetched.downloadMbps, 94.56);
  assert.ok(!Object.hasOwn(fetched, 'expiresAt'));
  assert.equal(store.get('unknown-id'), null);
});

test('expired measurements are never returned', async () => {
  const store = createMeasurementStore({
    runner: async () => ooklaResult,
    ttlMs: -1,
    generateId: () => 'measurement-expired',
  });
  await store.run();
  assert.equal(store.get('measurement-expired'), null);
});

test('only one speed test may run at a time', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const store = createMeasurementStore({ runner: () => gate });

  const first = store.run();
  await assert.rejects(store.run(), { code: 'MEASUREMENT_IN_PROGRESS' });
  release(ooklaResult);
  await first;
});

test('offline store reports unavailable without fabricating data', async () => {
  const store = createMeasurementStore({ runner: null });
  assert.equal(store.isAvailable(), false);
  await assert.rejects(store.run(), { code: 'MEASUREMENT_UNAVAILABLE' });
});

test('network failures become an honest unavailable error', async () => {
  const store = createMeasurementStore({ runner: async () => { throw new Error('DNS failure'); } });
  await assert.rejects(store.run(), { code: 'MEASUREMENT_UNAVAILABLE' });
});
