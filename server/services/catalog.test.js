import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createExecutor } from './executor.js';
import { createFixtureStore } from './fixtures.js';
import { createScenarioStore } from './scenarios.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scenarioDir = path.join(rootDir, 'data', 'scenarios');
const fixtureDir = path.join(rootDir, 'data', 'fixtures');
const MODULES = ['module1', 'module2', 'module3'];
const EDGE_STATUSES = new Set(['normal', 'failed', 'restored']);

function loadScenarios() {
  return readdirSync(scenarioDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => JSON.parse(readFileSync(path.join(scenarioDir, file), 'utf8')));
}

function topologiesOf(scenario) {
  const stages = [scenario.normal, scenario.failed, scenario.corrected].filter(Boolean);
  return [scenario.topology, ...stages.map((stage) => stage.topology)].filter(Boolean);
}

test('catalogue has four predefined scenarios per module', () => {
  const store = createScenarioStore(scenarioDir);
  assert.equal(store.count, 12);
  MODULES.forEach((module) => {
    assert.equal(store.list(module).length, 4, `${module} must offer four cases`);
  });
});

test('every topology references real nodes and known edge statuses', () => {
  loadScenarios().forEach((scenario) => {
    topologiesOf(scenario).forEach((topology) => {
      const nodeIds = new Set(topology.nodes.map((node) => node.id));
      assert.equal(nodeIds.size, topology.nodes.length, `${scenario.id}: duplicate node id`);
      topology.edges.forEach((edge) => {
        assert.ok(nodeIds.has(edge.from), `${scenario.id}: edge ${edge.id} has no source node`);
        assert.ok(nodeIds.has(edge.to), `${scenario.id}: edge ${edge.id} has no target node`);
        assert.ok(EDGE_STATUSES.has(edge.status), `${scenario.id}: unknown edge status ${edge.status}`);
      });
    });
  });
});

test('every scenario has a matching fixture with honest provenance', () => {
  const store = createFixtureStore(fixtureDir);
  assert.equal(store.problems.length, 0, store.problems.map((problem) => problem.reason).join('; '));

  loadScenarios().forEach((scenario) => {
    const { operation, input } = scenario.execution;
    const fixture = store.get(scenario.id, operation, input);
    assert.ok(fixture, `${scenario.id}: no fixture matches the declared input`);

    const isMatlabExport = fixture.metadata.executionEngine === 'MATLAB';
    assert.equal(
      fixture.metadata.verificationStatus,
      isMatlabExport ? 'matlab_verified' : 'reference_verified',
      `${scenario.id}: verification status does not match the engine`,
    );
    assert.equal(
      fixture.metadata.matlabExportStatus,
      isMatlabExport ? 'complete' : 'pending',
      `${scenario.id}: MATLAB export claim is inconsistent`,
    );
  });
});

test('executor serves one scenario per module without claiming live execution', async () => {
  const store = createScenarioStore(scenarioDir);
  const executor = createExecutor({ fixtureStore: createFixtureStore(fixtureDir) });

  for (const module of MODULES) {
    const summary = store.list(module)[0];
    const scenario = store.get(module, summary.id);
    const outcome = await executor.execute({
      module,
      scenario_id: scenario.id,
      operation: scenario.execution.operation,
      input: scenario.execution.input,
    });

    assert.equal(outcome.status, 'success', `${module}: ${outcome.error?.message ?? 'failed'}`);
    assert.ok(
      ['reference_verified_fixture', 'matlab_fixture'].includes(outcome.result_source),
      `${module}: unexpected provenance ${outcome.result_source}`,
    );
    assert.equal(outcome.live_execution_available, false);
  }
});
