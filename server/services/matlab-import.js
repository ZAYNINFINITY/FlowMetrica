import { deepEqual, near } from './compare.js';
import { validateResult } from './executor.js';
import { assertFixtureShape, canonicalHash } from './fixtures.js';
import { solveSystem } from './matrix.js';

/**
 * MATLAB Online can export fixtures, but it cannot execute code for the app.
 * This verifier accepts an exported JSON file only when it is self-described as
 * a MATLAB export, matches a real scenario input, and agrees with the reference
 * solver. It never makes the result "live" — provenance stays explicit.
 */

const METADATA = {
  verificationStatus: 'matlab_verified',
  executionEngine: 'MATLAB',
  matlabExportStatus: 'complete',
};

function resultMatches(expected, actual) {
  if (!actual || typeof actual !== 'object') return false;
  return (
    actual.classification === expected.classification &&
    near(actual.rank, expected.rank) &&
    near(actual.variableCount, expected.variableCount) &&
    deepEqual(actual.pivotColumns, expected.pivotColumns) &&
    deepEqual(actual.rref, expected.rref) &&
    deepEqual(actual.solution ?? null, expected.solution ?? null)
  );
}

function expectedOutput(operation, input) {
  if (operation === 'analyze_anomaly') {
    if (!Array.isArray(input?.stages)) return null;
    return input.stages.map((stage) => ({
      id: stage.id,
      result: solveSystem(stage.matrix, stage.vector),
    }));
  }
  if (!input?.matrix || !input?.vector) return null;
  return solveSystem(input.matrix, input.vector);
}

function outputMatchesReference(operation, input, output) {
  const expected = expectedOutput(operation, input);
  if (!expected) return false;

  if (operation === 'analyze_anomaly') {
    if (!Array.isArray(output.stages) || output.stages.length !== expected.length) return false;
    return expected.every(({ id, result }) => {
      const stage = output.stages.find((item) => item?.id === id);
      return stage && resultMatches(result, stage);
    });
  }

  return resultMatches(expected, output);
}

function assertMatlabMetadata(fixture) {
  if (fixture.functionName !== fixture.operation) {
    throw new Error('Exported functionName does not match its operation.');
  }
  for (const [field, expected] of Object.entries(METADATA)) {
    if (fixture.metadata[field] !== expected) {
      throw new Error(`Exported metadata ${field} is not a MATLAB verification marker.`);
    }
  }
}

export function createMatlabImportVerifier({ scenarioStore }) {
  const byId = new Map(scenarioStore.list().map((scenario) => [scenario.id, scenario]));

  /** Returns { ok, fixture?, error? }. Callers show `error` directly in the UI. */
  function verify(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { ok: false, error: 'The export must be a JSON object.' };
    }

    try {
      assertFixtureShape(payload);
      assertMatlabMetadata(payload);

      const scenario = byId.get(payload.scenarioId);
      if (!scenario) return { ok: false, error: 'No current scenario matches this export.' };
      if (scenario.operation !== payload.operation) {
        return { ok: false, error: 'The exported operation does not match its scenario.' };
      }

      const currentInput = scenarioStore.get(scenario.module, scenario.id)?.execution?.input;
      if (!currentInput || !deepEqual(currentInput, payload.input)) {
        return { ok: false, error: 'The exported input does not match the current scenario.' };
      }

      const checked = validateResult(payload.output, payload.operation);
      if (!checked.ok) return { ok: false, error: checked.errors.join(' ') };
      if (!outputMatchesReference(payload.operation, currentInput, payload.output)) {
        return { ok: false, error: 'The exported answer disagrees with the reference solver.' };
      }

      return {
        ok: true,
        fixture: {
          scenarioId: payload.scenarioId,
          operation: payload.operation,
          fixtureVersion: payload.fixtureVersion,
          functionName: payload.functionName,
          input: payload.input,
          output: payload.output,
          metadata: payload.metadata,
        },
        inputHash: canonicalHash(payload.input),
      };
    } catch (error) {
      return { ok: false, error: error.message ?? 'The export could not be verified.' };
    }
  }

  return { verify };
}
