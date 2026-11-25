import { randomUUID } from 'node:crypto';

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 20;
const round = (value, digits) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function createMeasurementError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.publicMessage = message;
  return error;
}

/**
 * Accept either the library's documented OAResult or a simpler {download, upload, ping}
 * shape. Missing or non-finite values are rejected — no invented fallback numbers.
 */
export function normalizeMeasurement(raw, measuredAt) {
  const downloadSource = raw?.downloadResult ?? raw?.download;
  const uploadSource = raw?.uploadResult ?? raw?.upload;
  const pingSource = raw?.pingResult ?? raw?.ping;
  const downloadMbps = Number(downloadSource?.speed ?? downloadSource);
  const uploadMbps = Number(uploadSource?.speed ?? uploadSource);
  const pingMs = Number(pingSource?.latency ?? pingSource);
  const jitterMs = Number(pingSource?.jitter ?? raw?.jitter ?? 0);
  const packetLoss = Number(raw?.packetLoss ?? 0);
  const values = { downloadMbps, uploadMbps, pingMs, jitterMs, packetLoss };

  const invalid = Object.entries(values).find(
    ([, value]) => !Number.isFinite(value) || value < 0,
  );
  if (invalid || downloadMbps <= 0 || uploadMbps <= 0) {
    throw createMeasurementError(
      'MEASUREMENT_INVALID_RESULT',
      'Speed test did not return usable download and upload values. Try again.',
    );
  }

  const server = raw?.bestServer ?? raw?.server ?? {};
  const client = raw?.client ?? {};
  return {
    downloadMbps: round(downloadMbps, 2),
    uploadMbps: round(uploadMbps, 2),
    pingMs: round(pingMs, 1),
    jitterMs: round(jitterMs, 1),
    packetLoss: round(packetLoss, 2),
    server: {
      name: String(server.name ?? server.sponsor ?? 'Ookla server'),
      country: String(server.country ?? ''),
      sponsor: String(server.sponsor ?? ''),
    },
    isp: String(client.isp ?? raw?.isp ?? 'Unknown ISP'),
    measuredAt,
  };
}

/** Starts a real Ookla test. Upload measurement is opt-in in the library. */
export async function createOoklaRunner(options = {}) {
  const { UniversalSpeedTest } = await import('universal-speedtest');
  const tester = new UniversalSpeedTest({
    debug: false,
    tests: { measureDownload: true, measureUpload: true },
    units: { downloadUnit: 'Mbps', uploadUnit: 'Mbps' },
    ...options,
  });
  return () => tester.performOoklaTest();
}

/**
 * The server owns measured values. Clients only receive an opaque id, so they
 * cannot attach a "Live Network Measurement" label to invented numbers.
 */
export function createMeasurementStore({
  runner = null,
  ttlMs = DEFAULT_TTL_MS,
  now = () => new Date().toISOString(),
  generateId = () => randomUUID(),
} = {}) {
  const entries = new Map();
  let busy = false;

  function prune() {
    const deadline = Date.now() - ttlMs;
    entries.forEach((entry, id) => {
      if (Date.parse(entry.expiresAt) <= deadline) entries.delete(id);
    });
  }

  async function run() {
    if (!runner) {
      throw createMeasurementError('MEASUREMENT_UNAVAILABLE', 'Live measurement is not available on this server.');
    }
    if (busy) {
      throw createMeasurementError('MEASUREMENT_IN_PROGRESS', 'A speed test is already running. Please wait.');
    }

    busy = true;
    let measurement;
    try {
      const raw = await runner();
      measurement = { id: generateId(), ...normalizeMeasurement(raw, now()) };
    } catch (error) {
      if (error.code?.startsWith('MEASUREMENT_')) throw error;
      throw createMeasurementError(
        'MEASUREMENT_UNAVAILABLE',
        'Speed test could not reach Ookla. Predefined scenarios still work offline.',
      );
    } finally {
      busy = false;
    }

    prune();
    entries.set(measurement.id, {
      ...measurement,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    });
    while (entries.size > MAX_ENTRIES) {
      entries.delete(entries.keys().next().value);
    }
    return measurement;
  }

  function get(id) {
    if (typeof id !== 'string') return null;
    prune();
    const entry = entries.get(id);
    if (!entry) return null;
    const { expiresAt, ...publicMeasurement } = entry;
    return { ...publicMeasurement };
  }

  return { isAvailable: () => Boolean(runner), run, get };
}
