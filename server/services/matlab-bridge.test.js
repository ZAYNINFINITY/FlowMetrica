import assert from 'node:assert/strict';
import test from 'node:test';

import { createMatlabBridge } from './matlab-bridge.js';

const credentials = {
  MATLAB_REST_URL: 'https://localhost:9920/matlab/feval/v1/FlowMetrica',
  MATLAB_REST_TOKEN: 'secret-token-value',
};

const matlabResult = {
  classification: 'unique',
  consistent: true,
  rref: [[1, 0, 60], [0, 1, 40]],
  rank: 2,
  variableCount: 2,
  // Legacy MATLAB structs use one-based pivots; the bridge normalises them.
  pivotColumns: [1, 2],
  solution: [60, 40],
  steps: [{ operation: 'Initial augmented matrix', reason: 'Start', matrix: [[1, 1, 100], [1, -1, 20]] }],
  parametricForm: [],
};

const transportReturning = (payload) => async () => payload;

test('offline bridge reports unavailable and refuses to invent a call', async () => {
  const bridge = createMatlabBridge({ env: {} });
  assert.equal(bridge.status().configured, false);
  assert.equal(bridge.status().available, false);
  await assert.rejects(
    () => bridge.callFunction('solve_network_flow', [[[1]], [1]]),
    { code: 'MATLAB_NOT_CONFIGURED' },
  );
});

test('configured bridge normalises a successful MATLAB response', async () => {
  let seen = null;
  const bridge = createMatlabBridge({
    env: credentials,
    transport: async (request) => {
      seen = request;
      return { lhs: [matlabResult] };
    },
  });

  const result = await bridge.callFunction('solve_network_flow', [
    [[1, 1], [1, -1]],
    [100, 20],
  ]);

  assert.deepEqual(result.solution, [60, 40]);
  assert.deepEqual(result.pivotColumns, [0, 1]);
  assert.equal(result.rank, 2);
  assert.equal(bridge.status().available, true);
  assert.ok(bridge.status().verifiedAt);
  assert.deepEqual(JSON.parse(seen.body), {
    rhs: [[[1, 1], [1, -1]], [100, 20]],
    nargout: 1,
    outputFormat: { mode: 'small', nanType: 'string' },
  });
});

test('token is sent in the header but never exposed by setup status', async () => {
  let seen = null;
  const bridge = createMatlabBridge({
    env: credentials,
    transport: async (request) => {
      seen = request;
      return { lhs: [matlabResult] };
    },
  });
  await bridge.callFunction('investigate_incident', [[[1]], [1]]);
  assert.equal(seen.token, credentials.MATLAB_REST_TOKEN);
  assert.ok(!JSON.stringify(bridge.status()).includes(credentials.MATLAB_REST_TOKEN));
});

test('large-notation matrices are decoded from column-major data', async () => {
  const large = {
    classification: 'unique',
    rref: { mwdata: [1, 0, 0, 1, 60, 40], mwsize: [2, 3], mwtype: 'double' },
    rank: 2,
    variableCount: 2,
    pivotColumns: [0, 1],
    solution: [60, 40],
  };
  const bridge = createMatlabBridge({ env: credentials, transport: transportReturning({ lhs: [large] }) });
  const result = await bridge.callFunction('solve_network_flow', [[[1]], [1]]);
  assert.deepEqual(result.rref, [[1, 0, 60], [0, 1, 40]]);
});

test('anomaly stages are normalised as a collection', async () => {
  const payload = {
    lhs: [{ stages: [matlabResult, { ...matlabResult, classification: 'no_solution', consistent: false }] }],
  };
  const bridge = createMatlabBridge({ env: credentials, transport: transportReturning(payload) });
  const result = await bridge.callFunction('analyze_anomaly', [{ stages: [] }]);
  assert.equal(result.stages.length, 2);
  assert.equal(result.stages[1].classification, 'no_solution');
});

test('bridge failures surface a code instead of a fake result', async () => {
  const bridge = createMatlabBridge({
    env: credentials,
    transport: async () => {
      const error = new Error('Connection refused at https://localhost:9920');
      error.code = 'MATLAB_REQUEST_FAILED';
      throw error;
    },
  });
  await assert.rejects(
    () => bridge.callFunction('solve_network_flow', [[[1]], [1]]),
    { code: 'MATLAB_REQUEST_FAILED', message: 'Connection refused at https://localhost:9920' },
  );
  assert.equal(bridge.status().available, false);
});

test('insecure configured URL is rejected before any call', () => {
  const bridge = createMatlabBridge({
    env: { ...credentials, MATLAB_REST_URL: 'http://localhost:9920/matlab/feval/v1/FlowMetrica' },
  });
  assert.equal(bridge.status().configured, false);
  assert.match(bridge.status().reason, /https:\/\//i);
});
