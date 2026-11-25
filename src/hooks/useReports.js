import { useSyncExternalStore } from 'react';

import {
  clearReports,
  deleteReport,
  getReportsServerSnapshot,
  getReportsSnapshot,
  saveReport,
  subscribeReports,
} from '../lib/history.js';

/** One subscription to the localStorage-backed report store. */
export function useReports() {
  const reports = useSyncExternalStore(
    subscribeReports,
    getReportsSnapshot,
    getReportsServerSnapshot,
  );

  return { reports, saveReport, deleteReport, clearReports };
}
