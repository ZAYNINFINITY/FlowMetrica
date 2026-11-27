import { useCallback, useEffect, useState } from 'react';

import { enqueueMatlabWorkerJob, execute, getScenario, getScenarios } from '../lib/api.js';
import { getMatlabImport } from '../lib/matlab-imports.js';
import {
  isWorkerSessionActive,
  readWorkerSession,
} from '../lib/matlab-worker-session.js';

/**
 * Shared scenario loader/executor for all three modules.
 * One code path means one place to fix provenance and error handling.
 */
export function useScenario(module, matlabWorkerEnabled = false) {
  const [scenarios, setScenarios] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workerStatus, setWorkerStatus] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    getScenarios(module)
      .then((payload) => {
        if (!active) return;
        setScenarios(payload.scenarios);
        setSelectedId((current) => current ?? payload.scenarios[0]?.id ?? null);
      })
      .catch((cause) => active && setError(cause.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [module]);

  /**
   * Worker mode is an explicit opt-in. The browser only uploads a predefined
   * scenario; the server owns the job, re-verifies the answer and labels it.
   */
  async function runWithMatlabWorker(payload, active) {
    const session = readWorkerSession();
    if (!isWorkerSessionActive(session)) {
      throw new Error('Start a MATLAB Online worker in Settings before running this mode.');
    }

    setWorkerStatus('Waiting for the MATLAB Online worker…');
    const queued = await enqueueMatlabWorkerJob(payload, session.token);
    const deadline = Date.parse(session.expiresAt);
    let attempts = 0;

    while (active && Date.now() < deadline && attempts < 400) {
      attempts += 1;
      await new Promise((resolve) => {
        window.setTimeout(resolve, queued.pollAfterMs ?? 1500);
      });
      if (!active) return null;

      const attempt = await execute({
        ...payload,
        workerJobId: queued.jobId,
        workerToken: session.token,
      });
      if (attempt.status === 'success') return attempt;
      if (attempt.status === 'error') throw new Error(attempt.error.message);
      if (attempt.status !== 'worker_pending') {
        throw new Error('The MATLAB worker returned an unexpected state.');
      }
    }
    if (!active) return null;
    throw new Error('The MATLAB worker did not finish before its token expired.');
  }

  useEffect(() => {
    if (!selectedId) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    setWorkerStatus(matlabWorkerEnabled ? 'Starting MATLAB Online worker…' : null);

    (async () => {
      try {
        const detail = await getScenario(module, selectedId);
        if (!active) return;
        setScenario(detail.scenario);

        const payload = {
          module,
          scenario_id: detail.scenario.id,
          operation: detail.scenario.execution.operation,
          input: detail.scenario.execution.input,
        };

        let result;
        if (matlabWorkerEnabled) {
          result = await runWithMatlabWorker(payload, active);
        } else {
          const fixtureOverride = getMatlabImport(
            detail.scenario.id,
            detail.scenario.execution.operation,
          );
          result = await execute({
            ...payload,
            ...(fixtureOverride ? { fixtureOverride } : {}),
          });
        }
        if (active && result) setOutcome(result);
      } catch (cause) {
        if (active) {
          setOutcome(null);
          setError(cause.message);
        }
      } finally {
        if (active) {
          setLoading(false);
          setWorkerStatus(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [module, selectedId, revision, matlabWorkerEnabled]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { scenarios, selectedId, setSelectedId, scenario, outcome, loading, error, workerStatus, reload };
}
