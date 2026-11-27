import { useCallback, useEffect, useState } from 'react';

import { execute, getScenario, getScenarios } from '../lib/api.js';
import { getMatlabImport } from '../lib/matlab-imports.js';

/**
 * Shared scenario loader/executor for all three modules.
 * One code path means one place to fix provenance and error handling.
 */
export function useScenario(module) {
  const [scenarios, setScenarios] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  useEffect(() => {
    if (!selectedId) return undefined;
    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const detail = await getScenario(module, selectedId);
        if (!active) return;
        setScenario(detail.scenario);

        const fixtureOverride = getMatlabImport(
          detail.scenario.id,
          detail.scenario.execution.operation,
        );
        const result = await execute({
          module,
          scenario_id: detail.scenario.id,
          operation: detail.scenario.execution.operation,
          input: detail.scenario.execution.input,
          ...(fixtureOverride ? { fixtureOverride } : {}),
        });
        if (active) setOutcome(result);
      } catch (cause) {
        if (active) {
          setOutcome(null);
          setError(cause.message);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [module, selectedId, revision]);

  const reload = useCallback(() => setRevision((value) => value + 1), []);

  return { scenarios, selectedId, setSelectedId, scenario, outcome, loading, error, reload };
}
