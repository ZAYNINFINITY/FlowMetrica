import { readFileSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';

import { LIVE_MATLAB_REASON } from './capabilities.js';

const ALLOWED_FUNCTIONS = new Set(['solve_network_flow', 'analyze_anomaly', 'investigate_incident']);
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const CLASSIFICATIONS = new Set(['unique', 'infinite_solutions', 'no_solution']);

/** Errors carry a stable code so the API never leaks a raw network string. */
export function createBridgeError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.publicMessage = message;
  return error;
}

const isLargeArray = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.hasOwn(value, 'mwdata') &&
  Object.hasOwn(value, 'mwsize') &&
  Object.hasOwn(value, 'mwtype');

/** JSON "large notation" stores numeric matrices column-major. */
function decodeNumeric(data, size) {
  if (!Array.isArray(data) || size?.length !== 2) return data;
  const [rows, columns] = size;
  if (!Number.isInteger(rows) || !Number.isInteger(columns)) return data;
  if (rows <= 1 || columns <= 1 || rows * columns !== data.length) return data;
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => data[column * rows + row]),
  );
}

function decodeMatlabValue(value) {
  if (Array.isArray(value)) return value.map(decodeMatlabValue);
  if (value === null || typeof value !== 'object') return value;
  if (isLargeArray(value)) {
    const { mwdata, mwsize, mwtype } = value;
    if (mwtype === 'struct') return decodeMatlabValue(mwdata);
    if (mwtype === 'char') {
      return Array.isArray(mwdata) ? String.fromCharCode(...mwdata) : String(mwdata);
    }
    return decodeNumeric(mwdata, mwsize);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, decodeMatlabValue(item)]),
  );
}

function toNumberMatrix(value) {
  if (!Array.isArray(value)) return [];
  return value.map((row) => (Array.isArray(row) ? row.map(Number) : [Number(row)]));
}

function toNumberArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return (Array.isArray(value) ? value : [value]).map(Number);
}

/**
 * Convert a MATLAB struct into the exact result shape used by the saved fixtures.
 * MATLAB uses one-based pivot indices; older exports may still carry that form.
 */
function normalizeSystemResult(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const pivotColumns = toNumberArray(raw.pivotColumns).map((pivot) =>
    pivot >= 1 ? pivot - 1 : pivot,
  );
  const solution = toNumberArray(raw.solution);
  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .filter((step) => step && typeof step === 'object')
        .map((step) => ({
          operation: String(step.operation ?? ''),
          reason: String(step.reason ?? ''),
          matrix: toNumberMatrix(step.matrix),
        }))
    : [];
  const parametricForm = Array.isArray(raw.parametricForm)
    ? raw.parametricForm.map((line) => String(line))
    : [];

  return {
    classification: CLASSIFICATIONS.has(raw.classification) ? raw.classification : 'no_solution',
    consistent: raw.consistent === undefined ? raw.classification !== 'no_solution' : Boolean(raw.consistent),
    rank: Number(raw.rank) || 0,
    variableCount: Number(raw.variableCount) || 0,
    pivotColumns,
    rref: toNumberMatrix(raw.rref),
    steps,
    solution,
    parametricForm,
  };
}

export function normalizeMatlabResponse(payload, operation) {
  const decoded = decodeMatlabValue(payload);
  if (operation === 'analyze_anomaly') {
    const rawStages = Array.isArray(decoded?.stages) ? decoded.stages : [];
    if (rawStages.length === 0) {
      throw createBridgeError('MATLAB_INVALID_RESPONSE', 'MATLAB returned no anomaly stages.');
    }
    return {
      stages: rawStages.map((stage) => ({
        id: String(stage?.id ?? ''),
        ...normalizeSystemResult(stage),
      })),
    };
  }

  const result = normalizeSystemResult(decoded);
  if (!result) {
    throw createBridgeError('MATLAB_INVALID_RESPONSE', 'MATLAB returned an empty result.');
  }
  return result;
}

function defaultTransport({ url, token, certificate, body, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    if (target.protocol !== 'https:') {
      reject(createBridgeError('MATLAB_INVALID_URL', 'MATLAB bridge URL must use HTTPS.'));
      return;
    }

    const request = httpsRequest(
      {
        method: 'POST',
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          mwRESTPersonalAccessToken: token,
          ...(certificate ? { ca: certificate } : {}),
        },
      },
      (response) => {
        const chunks = [];
        let received = 0;
        response.on('data', (chunk) => {
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) {
            request.destroy(createBridgeError('MATLAB_RESPONSE_TOO_LARGE', 'MATLAB response was too large.'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf8');
            const parsed = text ? JSON.parse(text) : null;
            if (response.statusCode >= 400) {
              reject(createBridgeError('MATLAB_REQUEST_FAILED', `MATLAB responded with HTTP ${response.statusCode}.`));
              return;
            }
            resolve(parsed);
          } catch {
            reject(createBridgeError('MATLAB_INVALID_RESPONSE', 'MATLAB response was not valid JSON.'));
          }
        });
      },
    );

    request.setTimeout(timeoutMs, () => {
      request.destroy(createBridgeError('MATLAB_TIMEOUT', 'MATLAB did not respond in time.'));
    });
    request.on('error', (error) => {
      reject(error.code ? error : createBridgeError('MATLAB_REQUEST_FAILED', 'Could not reach MATLAB.'));
    });
    request.write(body);
    request.end();
  });
}

/**
 * Opt-in bridge to a MathWorks REST Function Service running in desktop MATLAB.
 * Absent credentials mean "offline" — never a claim of live execution.
 */
export function createMatlabBridge({
  env = process.env,
  transport = defaultTransport,
  loadCertificate = (filePath) => readFileSync(filePath, 'utf8'),
  now = () => new Date().toISOString(),
} = {}) {
  let config = null;
  let configError = null;

  try {
    const url = env.MATLAB_REST_URL?.trim();
    const token = env.MATLAB_REST_TOKEN?.trim();
    if (url && token) {
      config = {
        url: url.replace(/\/+$/, ''),
        token,
        certificate: env.MATLAB_REST_CA?.trim()
          ? loadCertificate(env.MATLAB_REST_CA.trim())
          : null,
        timeoutMs: Number(env.MATLAB_REST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
      };
      if (!config.url.startsWith('https://')) throw new Error('MATLAB_REST_URL must start with https://.');
    }
  } catch (error) {
    config = null;
    configError = createBridgeError('MATLAB_BAD_CONFIG', error.message);
  }

  const state = { verifiedAt: null };

  function status() {
    if (configError) {
      return { configured: false, verifiedAt: null, available: false, reason: `MATLAB bridge configuration error: ${configError.message}` };
    }
    if (!config) {
      return { configured: false, verifiedAt: null, available: false, reason: LIVE_MATLAB_REASON };
    }
    return {
      configured: true,
      verifiedAt: state.verifiedAt,
      available: Boolean(state.verifiedAt),
      reason: state.verifiedAt
        ? 'Connected to a MATLAB REST Function Service.'
        : 'MATLAB bridge credentials are set; waiting for a successful call.',
    };
  }

  async function callFunction(functionName, args) {
    if (configError) throw configError;
    if (!config) throw createBridgeError('MATLAB_NOT_CONFIGURED', 'MATLAB bridge is not configured.');
    if (!ALLOWED_FUNCTIONS.has(functionName)) {
      throw createBridgeError('MATLAB_UNKNOWN_FUNCTION', 'Unsupported MATLAB function.');
    }

    const body = JSON.stringify({
      rhs: args,
      nargout: 1,
      outputFormat: { mode: 'small', nanType: 'string' },
    });

    let payload;
    try {
      payload = await transport({
        url: `${config.url}/${functionName}`,
        token: config.token,
        certificate: config.certificate,
        body,
        timeoutMs: config.timeoutMs,
      });
    } catch (error) {
      throw error.code
        ? error
        : createBridgeError('MATLAB_REQUEST_FAILED', 'Could not reach MATLAB.');
    }

    if (!payload || typeof payload !== 'object') {
      throw createBridgeError('MATLAB_INVALID_RESPONSE', 'MATLAB response was empty.');
    }
    const raw = Array.isArray(payload.lhs) ? payload.lhs[0] : payload;
    const result = normalizeMatlabResponse(raw, functionName);
    state.verifiedAt = now();
    return result;
  }

  return { status, callFunction };
}
