/**
 * Verified MATLAB Online exports are kept in this browser only.
 *
 * Vercel has no writable fixture directory, so the server verifies each export
 * and returns it; the browser stores the verified copy and sends it back with
 * execution requests. The server re-checks it every time before using it.
 */
const STORAGE_KEY = 'flowmetrica.matlab-imports.v1';

const isFixture = (value) =>
  value &&
  typeof value === 'object' &&
  typeof value.scenarioId === 'string' &&
  typeof value.operation === 'string' &&
  value.output &&
  typeof value.output === 'object';

function readAll() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((entry) => isFixture(entry?.fixture)) : [];
  } catch {
    return [];
  }
}

function writeAll(entries) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // A full or disabled storage area must not break analysis; imports just stop persisting.
  }
}

const keyFor = (fixture) => `${fixture.scenarioId}:${fixture.operation}`;

export function listMatlabImports() {
  return readAll().map(({ fixture, importedAt }) => ({
    scenarioId: fixture.scenarioId,
    operation: fixture.operation,
    importedAt,
  }));
}

export function getMatlabImport(scenarioId, operation) {
  return readAll().find((entry) => keyFor(entry.fixture) === `${scenarioId}:${operation}`)?.fixture ?? null;
}

export function saveMatlabImport(fixture) {
  if (!isFixture(fixture)) return false;
  const entry = { fixture, importedAt: new Date().toISOString() };
  const entries = readAll().filter((current) => keyFor(current.fixture) !== keyFor(fixture));
  entries.push(entry);
  writeAll(entries);
  return true;
}

export function clearMatlabImports() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}
