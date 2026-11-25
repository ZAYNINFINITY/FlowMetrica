import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Short, stable identity for an input. Key order is fixed by our own JSON writers. */
export function canonicalHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

const fixtureKey = (scenarioId, operation, hash) => `${scenarioId}:${operation}:${hash}`;

function assertFixtureShape(fixture) {
  if (!fixture || typeof fixture !== 'object') throw new Error('Fixture is not an object.');
  for (const field of ['fixtureVersion', 'scenarioId', 'operation', 'functionName', 'input', 'output', 'metadata']) {
    if (fixture[field] === undefined) throw new Error(`Missing required field "${field}".`);
  }
  if (typeof fixture.fixtureVersion !== 'string') throw new Error('fixtureVersion must be a string.');
  if (typeof fixture.output !== 'object' || fixture.output === null) throw new Error('output must be an object.');
  if (typeof fixture.metadata?.verificationStatus !== 'string') {
    throw new Error('metadata.verificationStatus must be a string.');
  }
}

/**
 * Loads versioned fixtures once at startup. A malformed file is reported, never
 * silently accepted — a wrong "saved result" is worse than no saved result.
 */
export function createFixtureStore(directory) {
  const entries = new Map();
  const problems = [];

  readdirSync(directory)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .forEach((file) => {
      try {
        const fixture = JSON.parse(readFileSync(path.join(directory, file), 'utf8'));
        assertFixtureShape(fixture);
        entries.set(
          fixtureKey(fixture.scenarioId, fixture.operation, canonicalHash(fixture.input)),
          fixture,
        );
      } catch (error) {
        problems.push({ file, reason: error.message });
      }
    });

  return {
    size: entries.size,
    problems,
    get(scenarioId, operation, input) {
      return entries.get(fixtureKey(scenarioId, operation, canonicalHash(input))) ?? null;
    },
  };
}
