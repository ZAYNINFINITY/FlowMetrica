import assert from 'node:assert/strict';
import test from 'node:test';

import { createExecutor } from './executor.js';
import { validateExecutionRequest } from './validator.js';

const measurement = {
  id: 'measurement-001',
  downloadMbps: 100,
  uploadMbps: 20,
  pingMs: 12,
  jitterMs: 1.5,
  packetLoss: 0,
  server: { name: 'Lahore', country: 'Pakistan', sponsor: 'PTCL' },
  isp: 'Example ISP',
  measuredAt: '2026-11-25T10:00:00.000Z',
};

const liveRequest = {
  module: 'module1',
  scenario_id: 'network_traffic_live',
  operation: 'solve_live_measurement',
  input: {
    measurementId: measurement.id,
    matrix: [[1, 1], [1, -1]],
  },
};

const offlineBridge = {
  status: () => ({ configured: false, available: false, reason: 'offline' }),
  callFunction: async () => { throw new Error('unused'); },
};

const measurementStore = {
  isAvailable: () => true,
  get: (id) => (id === measurement.id ? { ...measurement } : null),
};

const matlabOutput = {
  classification: 'unique',
  consistent: true,
  rank: 2,
  variableCount: 2,
  pivotColumns: [0, 1],
  rref: [[1, 0, 60], [0, 1, 40]],
  steps: [],
  solution: [60, 40],
  parametricForm: [],
};

test('live measurement uses measured Mbps as the server-owned vector', async () => {
  const executor = createExecutor({
    fixtureStore: { get: () => null },
    matlabBridge: offlineBridge,
    measurementStore,
  });
  const outcome = await executor.execute(liveRequest);
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result_source, 'live_network_measurement');
  assert.equal(outcome.verification_status, 'measured_live');
  assert.deepEqual(outcome.applied_vector, [100, 20]);
  assert.deepEqual(outcome.result.solution, [60, 40]);
  assert.equal(outcome.live_execution_available, false);
});

test('an unknown measurement id is unavailable, never a saved result', async () => {
  const outcome = await createExecutor({
    fixtureStore: { get: () => ({ output: matlabOutput }) },
    matlabBridge: offlineBridge,
    measurementStore,
  }).execute({
    ...liveRequest,
    input: { ...liveRequest.input, measurementId: 'measurement-404' },
  });
  assert.equal(outcome.status, 'unavailable');
  assert.equal(outcome.error.code, 'MEASUREMENT_NOT_FOUND');
});

test('validator rejects a client-supplied vector for a live measurement', () => {
  const result = validateExecutionRequest({
    ...liveRequest,
    input: { ...liveRequest.input, vector: [999, 999] },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('server-owned')));
});

test('validator limits live measurement to module1 and a 2x2 system', () => {
  assert.equal(
    validateExecutionRequest({ ...liveRequest, module: 'module3' }).ok,
    false,
  );
  assert.equal(
    validateExecutionRequest({
      ...liveRequest,
      input: { ...liveRequest.input, matrix: [[1, 1, 0], [1, -1, 0]] },
    }).ok,
    false,
  );
});

test('configured MATLAB bridge returns a genuinely live result', async () => {
  const calls = [];
  const bridge = {
    status: () => ({ configured: true, available: true, reason: 'connected' }),
    callFunction: async (name, args) => {
      calls.push({ name, args });
      return matlabOutput;
    },
  };
  const outcome = await createExecutor({
    fixtureStore: { get: () => null },
    matlabBridge: bridge,
    measurementStore,
  }).execute({
    module: 'module1',
    scenario_id: 'network_traffic_01',
    operation: 'solve_network_flow',
    input: { matrix: [[1, 1], [1, -1]], vector: [100, 20] },
  });

  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result_source, 'live_matlab_execution');
  assert.equal(outcome.execution_engine, 'MATLAB');
  assert.equal(outcome.live_execution_available, true);
  assert.equal(calls[0].name, 'solve_network_flow');
});

test('a failed MATLAB call never silently substitutes a saved result', async () => {
  let fixtureReads = 0;
  const bridge = {
    status: () => ({ configured: true, available: false, reason: 'configured' }),
    callFunction: async () => {
      const error = new Error('MATLAB timed out.');
      error.code = 'MATLAB_TIMEOUT';
      throw error;
    },
  };
  const outcome = await createExecutor({
    fixtureStore: { get: () => { fixtureReads += 1; return { output: matlabOutput }; } },
    matlabBridge: bridge,
    measurementStore,
  }).execute({
    module: 'module1',
    scenario_id: 'network_traffic_01',
    operation: 'solve_network_flow',
    input: { matrix: [[1, 1], [1, -1]], vector: [100, 20] },
  });

  assert.equal(outcome.status, 'error');
  assert.equal(outcome.error.code, 'MATLAB_TIMEOUT');
  assert.equal(fixtureReads, 0);
});
