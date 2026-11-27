import { LIVE_MATLAB_REASON } from './capabilities.js';
import { createExecutionMode } from './execution-mode.js';
import { inputsMatch } from './compare.js';
import { canonicalHash } from './fixtures.js';
import { solveSystem } from './matrix.js';
import { validateResult } from './result-validation.js';
import { validateExecutionRequest } from './validator.js';

export { validateResult } from './result-validation.js';

const OFFLINE_BRIDGE = {
  status: () => ({ configured: false, available: false, reason: LIVE_MATLAB_REASON }),
  callFunction: async () => {
    throw new Error('MATLAB bridge is not configured.');
  },
};

const OFFLINE_MEASUREMENTS = { isAvailable: () => false, get: () => null };

/**
 * The ONLY entry point used by all three modules.
 * Order: validate → live MATLAB (if configured) → saved result → honest failure.
 * A configured bridge that fails never silently degrades into a "live" answer.
 */
export function createExecutor({
  fixtureStore,
  matlabBridge = OFFLINE_BRIDGE,
  measurementStore = OFFLINE_MEASUREMENTS,
  executionMode = createExecutionMode(),
  matlabImport = null,
  matlabWorker = null,
} = {}) {
  const bridgeStatus = matlabBridge.status();

  async function executeMATLAB(request) {
    // Read the mode on every call: the UI can switch it without a server restart.
    const { matlabLiveEnabled } = executionMode.get();
    if (!matlabLiveEnabled) {
      return { skipped: true, reason: 'MATLAB live execution is switched off.' };
    }
    if (!bridgeStatus.configured) {
      return {
        blocked: true,
        code: 'MATLAB_NOT_CONFIGURED',
        message: bridgeStatus.reason,
      };
    }

    const args =
      request.operation === 'analyze_anomaly'
        ? [request.input.stages]
        : [request.input.matrix, request.input.vector];

    try {
      const result = await matlabBridge.callFunction(request.operation, args);
      const checked = validateResult(result, request.operation);
      if (!checked.ok) {
        return {
          failed: true,
          code: 'MATLAB_RESULT_REJECTED',
          message: checked.errors.join(' '),
        };
      }
      return { available: true, result };
    } catch (error) {
      return {
        failed: true,
        code: error.code ?? 'MATLAB_REQUEST_FAILED',
        message: error.publicMessage ?? 'MATLAB live execution failed.',
      };
    }
  }

  function executeLiveMeasurement(request) {
    const measurement = measurementStore.get(request.input.measurementId);
    if (!measurement) {
      return {
        status: 'unavailable',
        error: {
          code: 'MEASUREMENT_NOT_FOUND',
          message: 'That measurement has expired or was not found. Run a new speed test.',
        },
      };
    }

    // The vector is built here, never accepted from the client.
    const vector = [measurement.downloadMbps, measurement.uploadMbps];
    const result = solveSystem(request.input.matrix, vector);
    const checked = validateResult(result, request.operation);
    if (!checked.ok) {
      return {
        status: 'error',
        error: {
          code: 'RESULT_VALIDATION_FAILED',
          message: `Measured result rejected: ${checked.errors.join(' ')}`,
        },
      };
    }

    return {
      status: 'success',
      module: request.module,
      scenario_id: request.scenario_id,
      operation: request.operation,
      input_hash: canonicalHash({ ...request.input, vector }),
      result,
      result_source: 'live_network_measurement',
      execution_engine: 'reference_javascript_gauss_jordan',
      verification_status: 'measured_live',
      applied_vector: vector,
      measurement,
      live_execution_available: bridgeStatus.available,
      matlab_bridge_configured: bridgeStatus.configured,
      matlab_live_enabled: executionMode.get().matlabLiveEnabled,
    };
  }

  /**
   * A worker request is an explicit opt-in, so it takes precedence over the
   * desktop live bridge. The server re-verifies the result before labelling it.
   */
  async function executeWorker(request) {
    if (!matlabWorker?.available) {
      return {
        status: 'error',
        error: {
          code: 'MATLAB_WORKER_UNAVAILABLE',
          message: matlabWorker?.reason ?? 'The MATLAB Online worker is not configured.',
        },
      };
    }
    try {
      const verified = await matlabWorker.getVerifiedResult(request.workerToken, request.workerJobId);
      if (verified.status === 'failed') {
        return {
          status: 'error',
          error: {
            code: 'MATLAB_WORKER_FAILED',
            message: verified.error ?? 'The MATLAB worker could not solve this scenario.',
          },
        };
      }
      if (verified.status !== 'success') {
        return {
          status: 'worker_pending',
          jobId: request.workerJobId,
          state: verified.status,
          pollAfterMs: 1500,
        };
      }
      return {
        status: 'success',
        module: request.module,
        scenario_id: request.scenario_id,
        operation: request.operation,
        input_hash: canonicalHash(request.input),
        result: verified.output,
        result_source: 'matlab_online_worker',
        execution_engine: 'MATLAB',
        verification_status: 'matlab_verified_worker',
        matlab_worker_job_id: verified.jobId,
        live_execution_available: false,
        matlab_bridge_configured: bridgeStatus.configured,
        matlab_live_enabled: executionMode.get().matlabLiveEnabled,
        provenance_note:
          'Computed in MATLAB Online by the worker you started; the server re-checked it against the reference solver.',
      };
    } catch (error) {
      return {
        status: 'error',
        error: {
          code: error.code ?? 'MATLAB_WORKER_FAILED',
          message: error.publicMessage ?? error.message ?? 'The MATLAB Online worker result could not be verified.',
        },
      };
    }
  }

  async function execute(request) {
    const validation = validateExecutionRequest(request);
    if (!validation.ok) {
      return {
        status: 'error',
        error: { code: 'INVALID_INPUT', message: validation.errors.join(' ') },
      };
    }

    if (request.operation === 'solve_live_measurement') return executeLiveMeasurement(request);
    if (request.workerJobId) return executeWorker(request);

    const live = await executeMATLAB(request);
    if (live.blocked) {
      return {
        status: 'error',
        error: {
          code: live.code,
          message: `MATLAB live execution is enabled but unavailable: ${live.message} Saved results were not substituted.`,
        },
      };
    }
    if (live.failed) {
      return {
        status: 'error',
        error: {
          code: live.code,
          message: `Live MATLAB execution failed: ${live.message} Saved results were not substituted.`,
        },
      };
    }

    if (live.available) {
      return {
        status: 'success',
        module: request.module,
        scenario_id: request.scenario_id,
        operation: request.operation,
        result: live.result,
        result_source: 'live_matlab_execution',
        execution_engine: 'MATLAB',
        verification_status: 'matlab_verified_live',
        live_execution_available: true,
        matlab_bridge_configured: true,
        matlab_live_enabled: true,
      };
    }

    // A MATLAB Online export is verified on every call, not trusted because the
    // browser says so. A rejected override never falls back silently.
    let fixture = null;
    let importedExport = false;
    if (request.fixtureOverride) {
      if (!matlabImport) {
        return {
          status: 'error',
          error: {
            code: 'MATLAB_EXPORT_UNSUPPORTED',
            message: 'MATLAB export import is not available on this server.',
          },
        };
      }
      const checkedOverride = matlabImport.verify(request.fixtureOverride);
      if (!checkedOverride.ok) {
        return {
          status: 'error',
          error: {
            code: 'MATLAB_EXPORT_REJECTED',
            message: `The imported MATLAB export was rejected: ${checkedOverride.error}`,
          },
        };
      }
      const candidate = checkedOverride.fixture;
      const mismatch =
        candidate.scenarioId !== request.scenario_id ||
        candidate.operation !== request.operation ||
        !inputsMatch(candidate.input, request.input);
      if (mismatch) {
        return {
          status: 'error',
          error: {
            code: 'MATLAB_EXPORT_REJECTED',
            message: 'The imported MATLAB export does not match this scenario and input.',
          },
        };
      }
      fixture = candidate;
      importedExport = true;
    } else {
      fixture = fixtureStore.get(request.scenario_id, request.operation, request.input);
    }

    if (!fixture) {
      return {
        status: 'unavailable',
        error: {
          code: 'NO_FIXTURE',
          message:
            'MATLAB live execution is not connected and no saved result matches this scenario. Try a predefined scenario.',
        },
      };
    }

    const checked = validateResult(fixture.output, request.operation);
    if (!checked.ok) {
      return {
        status: 'error',
        error: {
          code: 'RESULT_VALIDATION_FAILED',
          message: `Saved result rejected: ${checked.errors.join(' ')}`,
        },
      };
    }

    const isMatlabExport =
      fixture.metadata.executionEngine === 'MATLAB' &&
      fixture.metadata.matlabExportStatus === 'complete';

    return {
      status: 'success',
      module: request.module,
      scenario_id: request.scenario_id,
      operation: request.operation,
      input_hash: canonicalHash(request.input),
      result: fixture.output,
      result_source: isMatlabExport ? 'matlab_fixture' : 'reference_verified_fixture',
      execution_engine: fixture.metadata.executionEngine,
      verification_status: fixture.metadata.verificationStatus,
      matlab_export_status: fixture.metadata.matlabExportStatus,
      fixture_version: fixture.fixtureVersion,
      function_name: fixture.functionName,
      generated_at: fixture.metadata.generatedAt,
      live_execution_available: false,
      live_execution_reason: live.reason,
      matlab_bridge_configured: bridgeStatus.configured,
      matlab_live_enabled: executionMode.get().matlabLiveEnabled,
      imported_matlab_export: importedExport,
      ...(importedExport
        ? { matlab_export_note: 'Verified MATLAB Online export imported by you.' }
        : {}),
    };
  }

  return { execute };
}
