/**
 * Generates the offline result fixtures from an independent reference implementation.
 *
 * HONESTY NOTE: these are NOT MATLAB-generated results. The MATLAB source that
 * implements the same operations lives in matlab/. Once those scripts are run in
 * MATLAB Online, matlab/export_fixtures.m rewrites these files with genuine MATLAB
 * output and flips matlabExportStatus to "complete".
 */

import assert from 'node:assert/strict';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { solveSystem } from '../server/services/matrix.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scenariosDir = path.join(rootDir, 'server', 'data', 'scenarios');
const fixturesDir = path.join(rootDir, 'server', 'data', 'fixtures');

const FIXTURE_VERSION = '1.0.0';
const TOLERANCE = 1e-6;

function assertSolution(actual, expected, label) {
  assert.ok(Array.isArray(actual), `${label}: expected a solution vector`);
  assert.equal(actual.length, expected.length, `${label}: solution length differs`);
  expected.forEach((value, index) => {
    assert.ok(
      Math.abs(actual[index] - value) <= TOLERANCE,
      `${label}: x${index + 1} expected ${value}, got ${actual[index]}`,
    );
  });
}

function computeOutput(operation, input) {
  if (operation === 'solve_network_flow' || operation === 'investigate_incident') {
    return solveSystem(input.matrix, input.vector);
  }

  if (operation === 'analyze_anomaly') {
    return {
      stages: input.stages.map((stage) => ({
        id: stage.id,
        ...solveSystem(stage.matrix, stage.vector),
      })),
    };
  }

  throw new Error(`Unsupported operation: ${operation}`);
}

function verify(scenario, output) {
  const expected = scenario.verification ?? {};
  const label = scenario.id;

  if (expected.expectedClassification && output.classification !== expected.expectedClassification) {
    throw new Error(
      `${label}: expected ${expected.expectedClassification}, got ${output.classification}`,
    );
  }
  if (expected.expectedSolution) {
    assertSolution(output.solution, expected.expectedSolution, label);
  }
  if (expected.expectedClassifications) {
    output.stages.forEach((stage) => {
      const wanted = expected.expectedClassifications[stage.id];
      if (wanted && stage.classification !== wanted) {
        throw new Error(
          `${label}/${stage.id}: expected ${wanted}, got ${stage.classification}`,
        );
      }
    });
  }
}

mkdirSync(fixturesDir, { recursive: true });

const scenarios = readdirSync(scenariosDir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => JSON.parse(readFileSync(path.join(scenariosDir, file), 'utf8')));

scenarios.forEach((scenario) => {
  const { operation, input } = scenario.execution;
  const output = computeOutput(operation, input);
  verify(scenario, output);

  const fixture = {
    fixtureVersion: FIXTURE_VERSION,
    scenarioId: scenario.id,
    operation,
    functionName: operation,
    input,
    output,
    metadata: {
      verificationStatus: 'reference_verified',
      executionEngine: 'reference_javascript_gauss_jordan',
      matlabVersion: 'not executed — MATLAB Online export pending',
      generatedAt: new Date().toISOString(),
      matlabExportStatus: 'pending',
      method:
        'Independent Gauss-Jordan elimination with a 1e-9 tolerance, cross-checked against the expected classification and solution stored in the scenario.',
    },
  };

  const target = path.join(fixturesDir, `${scenario.id}.${operation}.json`);
  writeFileSync(target, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`[fixture] ${path.basename(target)} — ${output.classification ?? output.stages.map((stage) => stage.classification).join('/')}`);
});

console.log(`[fixture] ${scenarios.length} reference-verified fixtures written.`);
