import assert from 'node:assert/strict';
import test from 'node:test';

import { createExecutionMode } from './execution-mode.js';
import { createExecutor } from './executor.js';
import { createMatlabImportVerifier } from './matlab-import.js';

const input = {
  matrix: [[1, 1], [1, -1]],
  vector: [100, 20],
};

const output = {
  classification: 'unique',
  rank: 2,
  variableCount: 2,
  pivotColumns: [0, 1],
  rref: [[1, 0, 60], [0, 1, 40]],
  solution: [60, 40],
};

const validExport = {
  fixtureVersion: '1.0.0',
  scenarioId: 'network_traffic_01',
  operation: 'solve_network_flow',
  functionName: 'solve_network_flow',
  input,
  output,
  metadata: {
    verificationStatus: 'matlab_verified',
    executionEngine: 'MATLAB',
    matlabVersion: 'R2026b (MATLAB Online)',
    generatedAt: '2026-11-27T12:00:00.000Z',
    matlabExportStatus: 'complete',
    method: 'Computed with MATLAB Online and exported by the user.',
  },
};

const scenarioStore = {
  list: () => [
    { id: 'network_traffic_01', module: 'module1', operation: 'solve_network_flow' },
  ],
  get: () => ({ execution: { operation: 'solve_network_flow', input } }),
};

const verifier = createMatlabImportVerifier({ scenarioStore });

const offlineBridge = {
  status: () => ({ configured: false, available: false, reason: 'offline' }),
  callFunction: async () => { throw new Error('unused'); },
};

const request = {
  module: 'module1',
  scenario_id: 'network_traffic_01',
  operation: 'solve_network_flow',
  input,
};

test('MATLAB Online export verifier accepts a matching MATLAB result', () => {
  const checked = verifier.verify(validExport);
  assert.equal(checked.ok, true);
  assert.equal(checked.fixture.functionName, 'solve_network_flow');
});

test('MATLAB Online export verifier rejects a tampered answer', () => {
  const checked = verifier.verify({
    ...validExport,
    output: { ...output, solution: [999, 999] },
  });
  assert.equal(checked.ok, false);
  assert.match(checked.error, /reference solver/);
});

test('MATLAB Online export verifier rejects a non-MATLAB fixture', () => {
  const checked = verifier.verify({
    ...validExport,
    metadata: { ...validExport.metadata, verificationStatus: 'reference_verified' },
  });
  assert.equal(checked.ok, false);
  assert.match(checked.error, /MATLAB verification marker/);
});

test('a verified override is used as a saved result, never as a live result', async () => {
  let fixtureStoreReads = 0;
  const outcome = await createExecutor({
    fixtureStore: {
      get: () => {
        fixtureStoreReads += 1;
        throw new Error('A verified override must not read the saved fixture.');
      },
    },
    matlabBridge: offlineBridge,
    executionMode: createExecutionMode(),
    matlabImport: verifier,
  }).execute({ ...request, fixtureOverride: validExport });

  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result_source, 'matlab_fixture');
  assert.equal(outcome.verification_status, 'matlab_verified');
  assert.equal(outcome.live_execution_available, false);
  assert.equal(outcome.imported_matlab_export, true);
  assert.equal(outcome.matlab_export_note, 'Verified MATLAB Online export imported by you.');
  assert.equal(fixtureStoreReads, 0);
});

test('a rejected override is a hard error with no saved-result fallback', async () => {
  const outcome = await createExecutor({
    fixtureStore: { get: () => ({ output, metadata: validExport.metadata }) },
    matlabBridge: offlineBridge,
    executionMode: createExecutionMode(),
    matlabImport: verifier,
  }).execute({
    ...request,
    fixtureOverride: { ...validExport, input: { matrix: [[2, 0], [0, 2]], vector: [10, 4] } },
  });

  assert.equal(outcome.status, 'error');
  assert.equal(outcome.error.code, 'MATLAB_EXPORT_REJECTED');
});
