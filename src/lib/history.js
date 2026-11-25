/**
 * Reports persist in localStorage so they survive a restart without a database.
 * The module is also a tiny external store so the dashboard, the investigation
 * page and the saved-reports page always agree without prop drilling.
 */

const STORAGE_KEY = 'flowmetrica.reports.v1';
const MAX_REPORTS = 20;
const EMPTY = [];

let cache = null;
const listeners = new Set();

function readFromStorage() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    // Corrupted local data is ignored rather than shown as a valid report.
    return EMPTY;
  }
}

function snapshot() {
  if (cache === null) cache = readFromStorage();
  return cache;
}

function emit() {
  cache = null;
  listeners.forEach((listener) => listener());
}

function persist(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error('This browser refused to store the report. Local storage may be full or blocked.');
  }
  cache = next;
  emit();
}

export function loadReports() {
  return snapshot();
}

export function getReportsSnapshot() {
  return snapshot();
}

export function getReportsServerSnapshot() {
  return EMPTY;
}

export function subscribeReports(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function saveReport(report) {
  const next = [report, ...snapshot()].slice(0, MAX_REPORTS);
  persist(next);
  return next;
}

export function deleteReport(id) {
  const next = snapshot().filter((report) => report.id !== id);
  persist(next);
  return next;
}

export function clearReports() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    throw new Error('This browser refused to clear local storage.');
  }
  cache = EMPTY;
  emit();
  return EMPTY;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) emit();
  });
}
