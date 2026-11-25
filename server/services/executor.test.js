import assert from 'node:assert/strict';
import test from 'node:test';

import { createExecutor } from './executor.js';
import { validateExecutionRequest } from './validator.js';

const validRequest = {
  module: 'module1',
  scenario_id: 'network_traffic_01',
  operation: 'solve_network_flow',
  input: { matrix: [[1, 1], [1, -1]], vector: [100, 20] },
};

const validOutput = {
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

function makeFixture(overrides = {}) {
  return {
    fixtureVersion: '1.0.0',
    scenarioId: validRequest.scenario_id,
    operation: validRequest.operation,
    functionName: 'solve_network_flow',
    input: validRequest.input,
    output: validOutput,
    metadata: {
      verificationStatus: 'reference_verified',
      executionEngine: 'reference_javascript_gauss_jordan',
      matlabExportStatus: 'pending',
      generatedAt: '2026-11-25T00:00:00.000Z',
    },
    ...overrides,
  };
}

function makeStore(fixture) {
  return { get: () => fixture };
}

test('rejects invalid input before touching any service', async () => {
  const outcome = await createExecutor({ fixtureStore: makeStore(null) }).execute({
    ...validRequest,
    input: { matrix: [[1, 1], [1]], vector: [100, 20] },
  });
  assert.equal(outcome.status, 'error');
  assert.equal(outcome.error.code, 'INVALID_INPUT');
});

test('reports unavailable instead of inventing a result', async () => {
  const outcome = await createExecutor({ fixtureStore: makeStore(null) }).execute(validRequest);
  assert.equal(outcome.status, 'unavailable');
  assert.equal(outcome.error.code, 'NO_FIXTURE');
});

test('returns a saved result with explicit provenance', async () => {
  const outcome = await createExecutor({ fixtureStore: makeStore(makeFixture()) }).execute(validRequest);
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result_source, 'reference_verified_fixture');
  assert.equal(outcome.live_execution_available, false);
  assert.equal(outcome.matlab_export_status, 'pending');
  assert.deepEqual(outcome.result.solution, [60, 40]);
});

test('relabels provenance after a genuine MATLAB export', async () => {
  const fixture = makeFixture({
    metadata: {
      verificationStatus: 'matlab_verified',
      executionEngine: 'MATLAB',
      matlabExportStatus: 'complete',
      generatedAt: '2026-11-25T00:00:00.000Z',
    },
  });
  const outcome = await createExecutor({ fixtureStore: makeStore(fixture) }).execute(validRequest);
  assert.equal(outcome.result_source, 'matlab_fixture');
  assert.equal(outcome.execution_engine, 'MATLAB');
});

test('rejects a malformed saved result', async () => {
  const fixture = makeFixture({ output: { classification: 'magic', rref: [] } });
  const outcome = await createExecutor({ fixtureStore: makeStore(fixture) }).execute(validRequest);
  assert.equal(outcome.status, 'error');
  assert.equal(outcome.error.code, 'RESULT_VALIDATION_FAILED');
});

test('validator requires matching matrix and vector dimensions', () => {
  const result = validateExecutionRequest({
    ...validRequest,
    input: { matrix: [[1, 1], [1, -1], [1, 0]], vector: [1, 2] },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes('one row for each')));
});
