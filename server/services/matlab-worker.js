import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { deepEqual } from './compare.js';
import { outputMatchesReference } from './matlab-import.js';
import { validateResult } from './result-validation.js';
import { validateExecutionRequest } from './validator.js';
import { createUpstashRestClient } from './upstash.js';

/**
 * MATLAB Online worker queue.
 *
 * MATLAB Online can make outbound HTTPS calls but cannot be called from outside.
 * The browser creates a short-lived token, the MATLAB worker polls this API with
 * webread/webwrite, and the server verifies every returned answer before the UI
 * may show it. State lives in Redis so the same flow works on Vercel.
 */
const SESSION_TTL_SECONDS = 15 * 60;
const JOB_TTL_SECONDS = 15 * 60;
const MAX_CLAIM_ATTEMPTS = 20;
const UNAVAILABLE_REASON =
  'The MATLAB Online worker needs UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN on the server.';

class WorkerError extends Error {
  constructor(code, status, message) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const nowIso = (timestamp) => new Date(timestamp).toISOString();

function remainingSeconds(expiresAt, now) {
  return Math.max(0, Math.floor((expiresAt - now()) / 1000));
}

/** Dependency-free local queue for `npm run dev` only. Never used on Vercel. */
export function createMemoryWorkerStore({ now = () => Date.now() } = {}) {
  const values = new Map();
  const lists = new Map();

  function read(key) {
    const entry = values.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      values.delete(key);
      return null;
    }
    return entry.value;
  }

  return {
    async get(key) {
      return read(key) ?? null;
    },
    async set(key, value, ttlSeconds) {
      values.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
      return 'OK';
    },
    async del(key) {
      values.delete(key);
      lists.delete(key);
      return 1;
    },
    async lpush(key, value) {
      const list = lists.get(key) ?? [];
      list.unshift(value);
      lists.set(key, list);
      return list.length;
    },
    async rpop(key) {
      const list = lists.get(key) ?? [];
      const value = list.pop() ?? null;
      lists.set(key, list);
      return value;
    },
  };
}

export function createRedisWorkerStore({ client }) {
  return {
    async get(key) {
      const raw = await client.command('GET', key);
      return raw == null ? null : JSON.parse(raw);
    },
    async set(key, value, ttlSeconds) {
      await client.command('SET', key, JSON.stringify(value), 'EX', ttlSeconds);
    },
    async del(key) {
      await client.command('DEL', key);
    },
    async lpush(key, value) {
      await client.command('LPUSH', key, JSON.stringify(value));
    },
    async rpop(key) {
      const raw = await client.command('RPOP', key);
      return raw == null ? null : JSON.parse(raw);
    },
  };
}

/** The MATLAB command never contains Upstash credentials, only the short-lived worker token. */
export function buildWorkerCommand(apiBase, token) {
  let url;
  try {
    url = new URL(String(apiBase));
  } catch {
    throw new WorkerError('INVALID_API_BASE', 400, 'The worker API base must be a URL.');
  }
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!['https:', 'http:'].includes(url.protocol) || (url.protocol === 'http:' && !isLocal)) {
    throw new WorkerError('INVALID_API_BASE', 400, 'The worker API base must be HTTPS or local HTTP.');
  }
  const cleanBase = url.toString().replace(/\/$/, '');
  if (cleanBase.includes("'") || cleanBase.includes('\n') || !/^[A-Za-z0-9_-]+$/.test(token)) {
    throw new WorkerError('INVALID_WORKER_TOKEN', 400, 'The worker command could not be built safely.');
  }
  return `addpath(genpath(pwd)); flowmetrica_worker('${cleanBase}', '${token}')`;
}

function createUnavailableMatlabWorker(reason) {
  const reject = () => {
    throw new WorkerError('MATLAB_WORKER_UNAVAILABLE', 503, reason);
  };
  return {
    available: false,
    reason,
    status: () => ({ available: false, backend: 'unavailable', reason }),
    createSession: reject,
    getSessionStatus: reject,
    enqueue: reject,
    nextJob: reject,
    submitResult: reject,
    poll: reject,
    getVerifiedResult: reject,
  };
}

export function createMatlabWorkerService({
  store,
  scenarioStore,
  now = () => Date.now(),
  randomUUIDFn = randomUUID,
  tokenFactory = () => randomBytes(24).toString('base64url'),
  backend = 'upstash',
  backendNote = 'Shared Redis queue.',
} = {}) {
  if (!store || !scenarioStore) throw new Error('A worker store and scenario store are required.');

  const sessionKey = (hash) => `flowmetrica:worker:session:${hash}`;
  const queueKey = (hash) => `flowmetrica:worker:queue:${hash}`;
  const jobKey = (id) => `flowmetrica:worker:job:${id}`;
  const resultKey = (id) => `flowmetrica:worker:result:${id}`;

  function status() {
    return {
      available: true,
      backend,
      reason: backendNote,
      sessionTtlSeconds: SESSION_TTL_SECONDS,
      jobTtlSeconds: JOB_TTL_SECONDS,
    };
  }

  async function requireSession(token) {
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
      throw new WorkerError('MATLAB_WORKER_UNAUTHORIZED', 401, 'The worker token is missing or invalid.');
    }
    const sessionHash = hashToken(token);
    const session = await store.get(sessionKey(sessionHash));
    if (!session) {
      throw new WorkerError('MATLAB_WORKER_UNAUTHORIZED', 401, 'The worker token is missing or invalid.');
    }
    if (session.expiresAt <= now()) {
      throw new WorkerError('MATLAB_WORKER_EXPIRED', 401, 'The worker token has expired. Start a new worker in Settings.');
    }
    return { sessionHash, session };
  }

  async function createSession({ apiBase } = {}) {
    const token = tokenFactory();
    const sessionHash = hashToken(token);
    const createdAt = now();
    const expiresAt = createdAt + SESSION_TTL_SECONDS * 1000;
    const session = {
      sessionId: randomUUIDFn(),
      createdAt: nowIso(createdAt),
      expiresAt,
      status: 'active',
    };
    await store.set(sessionKey(sessionHash), session, SESSION_TTL_SECONDS);
    return {
      token,
      sessionId: session.sessionId,
      expiresAt: nowIso(expiresAt),
      command: buildWorkerCommand(apiBase, token),
      status: status(),
    };
  }

  async function getSessionStatus(token) {
    const { session } = await requireSession(token);
    return {
      status: 'active',
      sessionId: session.sessionId,
      expiresAt: nowIso(session.expiresAt),
      worker: status(),
    };
  }

  async function enqueue({ token, module, scenario_id, operation, input }) {
    const { sessionHash } = await requireSession(token);
    const request = { module, scenario_id, operation, input };
    const checked = validateExecutionRequest(request);
    if (!checked.ok) {
      throw new WorkerError('INVALID_INPUT', 400, checked.errors.join(' '));
    }
    if (operation === 'solve_live_measurement') {
      throw new WorkerError('INVALID_OPERATION', 400, 'Live measurements cannot be sent to the MATLAB worker.');
    }

    const scenario = scenarioStore.get(module, scenario_id);
    if (!scenario || scenario.execution.operation !== operation) {
      throw new WorkerError('SCENARIO_NOT_FOUND', 404, 'No current scenario matches this worker job.');
    }
    if (!deepEqual(scenario.execution.input, input)) {
      throw new WorkerError('INPUT_MISMATCH', 400, 'The worker input does not match the current scenario.');
    }

    const createdAt = now();
    const expiresAt = createdAt + JOB_TTL_SECONDS * 1000;
    const job = {
      id: randomUUIDFn(),
      sessionHash,
      module,
      scenario_id,
      operation,
      input,
      status: 'queued',
      createdAt: nowIso(createdAt),
      expiresAt,
    };
    const ttl = remainingSeconds(expiresAt, now);
    await store.set(jobKey(job.id), job, ttl);
    await store.lpush(queueKey(sessionHash), job.id);
    return {
      status: 'queued',
      jobId: job.id,
      pollAfterMs: 1500,
      expiresAt: nowIso(expiresAt),
    };
  }

  async function nextJob(token) {
    const { sessionHash } = await requireSession(token);
    for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt += 1) {
      const jobId = await store.rpop(queueKey(sessionHash));
      if (!jobId) return { job: null, worker: status() };
      const job = await store.get(jobKey(jobId));
      if (!job || job.sessionHash !== sessionHash) continue;
      if (job.expiresAt <= now()) {
        await store.del(jobKey(jobId));
        await store.del(resultKey(jobId));
        continue;
      }
      if (job.status !== 'queued') continue;

      job.status = 'processing';
      job.claimedAt = nowIso(now());
      await store.set(jobKey(job.id), job, remainingSeconds(job.expiresAt, now));
      return {
        job: {
          id: job.id,
          scenarioId: job.scenario_id,
          operation: job.operation,
          input: job.input,
        },
        worker: status(),
      };
    }
    return { job: null, worker: status() };
  }

  async function submitResult(token, { jobId, output, error } = {}) {
    const { sessionHash } = await requireSession(token);
    if (typeof jobId !== 'string' || !/^[a-f0-9-]{36}$/.test(jobId)) {
      throw new WorkerError('INVALID_JOB', 400, 'The worker job id is invalid.');
    }
    const job = await store.get(jobKey(jobId));
    if (!job || job.sessionHash !== sessionHash || job.status !== 'processing') {
      throw new WorkerError('JOB_NOT_FOUND', 404, 'That worker job is not active.');
    }
    if (job.expiresAt <= now()) {
      throw new WorkerError('MATLAB_WORKER_EXPIRED', 410, 'The worker job expired. Start the analysis again.');
    }

    const ttl = remainingSeconds(job.expiresAt, now);
    const failureMessage = typeof error === 'string' && error.trim()
      ? error.trim().slice(0, 300)
      : null;

    if (failureMessage) {
      job.status = 'failed';
      job.error = failureMessage;
      await store.set(jobKey(jobId), job, ttl);
      return { status: 'failed' };
    }

    const checked = validateResult(output, job.operation);
    if (!checked.ok) {
      job.status = 'failed';
      job.error = checked.errors.join(' ');
      await store.set(jobKey(jobId), job, ttl);
      return { status: 'rejected', errors: checked.errors };
    }
    if (!outputMatchesReference(job.operation, job.input, output)) {
      job.status = 'failed';
      job.error = 'The MATLAB worker answer disagrees with the reference solver.';
      await store.set(jobKey(jobId), job, ttl);
      return { status: 'rejected', errors: [job.error] };
    }

    const completedAt = now();
    await store.set(
      resultKey(jobId),
      {
        status: 'complete',
        jobId,
        output,
        completedAt: nowIso(completedAt),
        expiresAt: job.expiresAt,
      },
      ttl,
    );
    job.status = 'complete';
    await store.set(jobKey(jobId), job, ttl);
    return { status: 'accepted' };
  }

  async function getJobForSession(token, jobId) {
    const { sessionHash } = await requireSession(token);
    if (typeof jobId !== 'string' || !/^[a-f0-9-]{36}$/.test(jobId)) {
      throw new WorkerError('INVALID_JOB', 400, 'The worker job id is invalid.');
    }
    const job = await store.get(jobKey(jobId));
    if (!job || job.sessionHash !== sessionHash) {
      throw new WorkerError('JOB_NOT_FOUND', 404, 'That worker job was not found for this session.');
    }
    if (job.expiresAt <= now()) {
      throw new WorkerError('MATLAB_WORKER_EXPIRED', 410, 'The worker job expired. Start the analysis again.');
    }
    return job;
  }

  async function getVerifiedResult(token, jobId) {
    const job = await getJobForSession(token, jobId);
    if (job.status !== 'complete') {
      return {
        status: job.status,
        jobId,
        ...(job.status === 'failed' ? { error: job.error } : {}),
      };
    }
    const result = await store.get(resultKey(jobId));
    if (!result?.output) {
      throw new WorkerError('MATLAB_WORKER_EXPIRED', 410, 'The worker result expired. Start the analysis again.');
    }
    const checked = validateResult(result.output, job.operation);
    if (!checked.ok || !outputMatchesReference(job.operation, job.input, result.output)) {
      throw new WorkerError('MATLAB_WORKER_RESULT_REJECTED', 400, 'The worker result failed server verification.');
    }
    return { status: 'success', jobId, output: result.output, job };
  }

  async function poll(token, jobId) {
    const job = await getJobForSession(token, jobId);
    return {
      status: job.status,
      jobId,
      ...(job.status === 'failed' ? { error: job.error } : {}),
      pollAfterMs: 1500,
    };
  }

  return {
    available: true,
    reason: backendNote,
    status,
    createSession,
    getSessionStatus,
    enqueue,
    nextJob,
    submitResult,
    poll,
    getVerifiedResult,
  };
}

/** Builds the service from environment variables without importing dotenv. */
export function createMatlabWorkerFromEnv({ env, scenarioStore, isServerless = false }) {
  const url = env?.UPSTASH_REDIS_REST_URL;
  const token = env?.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const client = createUpstashRestClient({ url, token });
      return createMatlabWorkerService({
        store: createRedisWorkerStore({ client }),
        scenarioStore,
        backend: 'upstash',
        backendNote: 'Shared Upstash Redis queue.',
      });
    } catch (error) {
      return createUnavailableMatlabWorker(`The MATLAB Online worker configuration is invalid: ${error.message}`);
    }
  }

  // Local development still works without an account; production never uses memory.
  if (!isServerless && env?.NODE_ENV !== 'production') {
    return createMatlabWorkerService({
      store: createMemoryWorkerStore(),
      scenarioStore,
      backend: 'local-memory',
      backendNote: 'Local in-memory queue. Jobs are cleared on restart; set Upstash env vars for a shared queue.',
    });
  }

  return createUnavailableMatlabWorker(UNAVAILABLE_REASON);
}
