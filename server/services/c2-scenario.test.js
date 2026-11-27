import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createExecutor } from './executor.js';
import { createFixtureStore } from './fixtures.js';
import { outputMatchesReference } from './matlab-import.js';
import { solveSystem } from './matrix.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ID = 'incident_c2_shared_ap_capacity_01';
const scenario = JSON.parse(
  readFileSync(path.join(rootDir, 'data', 'scenarios', `${ID}.json`), 'utf8'),
);

test('C2 shared AP model is consistent, rank-deficient and underdetermined', () => {
  const { matrix, vector } = scenario.execution.input;
  const result = solveSystem(matrix, vector);

  assert.equal(matrix.length, 4);
  assert.equal(matrix[0].length, 6);
  assert.equal(result.classification, 'infinite_solutions');
  assert.equal(result.consistent, true);
  assert.equal(result.rank, 3);
  assert.equal(result.variableCount, 6);
  assert.deepEqual(result.pivotColumns, [0, 2, 4]);
  assert.equal(result.parametricForm.length, 6);
  assert.ok(result.rref.at(-1).every((value) => value === 0), 'fourth row must reduce to 0 = 0');
  assert.equal(scenario.verification.expectedClassification, result.classification);
});

test('C2 scenario explains six unknowns and separates capacity from algebra', () => {
  assert.equal(scenario.module, 'module3');
  assert.equal(scenario.execution.operation, 'investigate_incident');
  assert.equal(scenario.variables.length, 6);
  assert.equal(scenario.equations.length, 4);
  assert.deepEqual(
    scenario.capacity,
    {
      assumedMbps: 100,
      observedAggregateMbps: 120,
      excessMbps: 20,
      note: scenario.capacity.note,
    },
  );
  assert.ok(
    scenario.templateFindings.some((finding) => /does not prove|not prove/i.test(finding)),
    'must not claim the algebra proves a physical fault',
  );
  assert.ok(
    scenario.templateFindings.some((finding) => /capacity-planning observation/i.test(finding)),
    'must distinguish capacity overload from mathematical inconsistency',
  );
});

test('C2 fixture is present, honestly provenanced and reference-verified', () => {
  const store = createFixtureStore(path.join(rootDir, 'data', 'fixtures'));
  const { operation, input } = scenario.execution;
  const fixture = store.get(ID, operation, input);

  assert.ok(fixture, 'a matching fixture must exist');
  assert.equal(fixture.metadata.verificationStatus, 'reference_verified');
  assert.equal(fixture.metadata.executionEngine, 'reference_javascript_gauss_jordan');
  assert.equal(fixture.metadata.matlabExportStatus, 'pending');
  assert.equal(outputMatchesReference(operation, input, fixture.output), true);
});

test('executor serves C2 without claiming live MATLAB execution', async () => {
  const fixtureStore = createFixtureStore(path.join(rootDir, 'data', 'fixtures'));
  const executor = createExecutor({ fixtureStore });
  const { operation, input } = scenario.execution;
  const outcome = await executor.execute({
    module: 'module3',
    scenario_id: ID,
    operation,
    input,
  });

  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result_source, 'reference_verified_fixture');
  assert.equal(outcome.live_execution_available, false);
  assert.equal(outcome.result.classification, 'infinite_solutions');
});
