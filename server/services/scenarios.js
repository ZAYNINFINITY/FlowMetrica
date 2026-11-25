import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Scenario definitions are plain JSON so new cases need no code changes. */
export function createScenarioStore(directory) {
  const scenarios = readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      try {
        return JSON.parse(readFileSync(path.join(directory, file), 'utf8'));
      } catch (error) {
        console.warn(`[scenarios] skipped ${file}: ${error.message}`);
        return null;
      }
    })
    .filter(Boolean);

  function toSummary(scenario) {
    const topology = scenario.topology ?? scenario.normal?.topology ?? {};
    return {
      id: scenario.id,
      module: scenario.module,
      title: scenario.title,
      summary: scenario.summary,
      tags: scenario.tags ?? [],
      complexity: scenario.complexity ?? 'introductory',
      severity: scenario.severity ?? null,
      nodeCount: topology.nodes?.length ?? 0,
      edgeCount: topology.edges?.length ?? 0,
      operation: scenario.execution?.operation ?? null,
    };
  }

  return {
    count: scenarios.length,
    list(module) {
      return scenarios.filter((scenario) => !module || scenario.module === module).map(toSummary);
    },
    get(module, id) {
      return scenarios.find((scenario) => scenario.module === module && scenario.id === id) ?? null;
    },
  };
}
