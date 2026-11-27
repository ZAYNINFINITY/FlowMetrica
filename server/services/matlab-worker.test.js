import assert from 'node:assert/strict';
import test from 'node:test';

import { solveSystem } from './matrix.js';
import {
  buildWorkerCommand,
  createMatlabWorkerService,
  createMemoryWorkerStore,
} from './matlab-worker.js';

const input = { matrix: [[1, 1], [1, -1]], vector: [100, 20] };
const scenario = {
  id: 'network_traffic_01',
  module: 'module1',
  execution: { operation: 'solve_network_flow', input },
};
const scenarioStore = {
  count: 1,
  list: () => [scenario],
  get: (module, id) => (module === scenario.module && id === scenario.id ? scenario : null),
};
const token = 'worker_token_1234567890';
const jobId = '11111111-1111-4111-8111-111111111111';
const apiBase = 'https://flowmetrica-maths.vercel.app/api/matlab/worker';

let clock = 1_700_000_000_000;
const now = () => clock;

function makeService() {
  clock = 1_700_000_000_000;
  return createMatlabWorkerService({
    store: createMemoryWorkerStore({ now }),
    scenarioStore,
    now,
    tokenFactory: () => token,
    randomUUIDFn: () => jobId,
  });
}

async function queueOneJob(service) {
  await service.createSession({ apiBase });
  return service.enqueue({
    token,
    module: scenario.module,
    scenario_id: scenario.id,
    operation: scenario.execution.operation,
    input,
  });
}

test('worker full flow verifies a MATLAB Online result before exposing it', async () => {
  const service = makeService();
  const queued = await queueOneJob(service);
  const claimed = await service.nextJob(token);

  assert.equal(claimed.job.id, queued.jobId);
  assert.deepEqual(claimed.job.input, input);

  assert.equal((await service.getVerifiedResult(token, queued.jobId)).status, 'processing');
  const accepted = await service.submitResult(token, {
    jobId: queued.jobId,
    output: solveSystem(input.matrix, input.vector),
  });
  assert.equal(accepted.status, 'accepted');

  assert.equal((await service.poll(token, queued.jobId)).status, 'complete');
  const verified = await service.getVerifiedResult(token, queued.jobId);
  assert.equal(verified.status, 'success');
  assert.deepEqual(verified.output.solution, [60, 40]);
});

test('worker rejects an answer that disagrees with the reference solver', async () => {
  const service = makeService();
  const queued = await queueOneJob(service);
  await service.nextJob(token);

  const wrong = { ...solveSystem(input.matrix, input.vector), solution: [1, 1] };
  const submitted = await service.submitResult(token, { jobId: queued.jobId, output: wrong });

  assert.equal(submitted.status, 'rejected');
  assert.match(submitted.errors[0], /reference solver/);
  assert.equal((await service.poll(token, queued.jobId)).status, 'failed');
  const verified = await service.getVerifiedResult(token, queued.jobId);
  assert.equal(verified.status, 'failed');
  assert.match(verified.error, /reference solver/);
});

test('a different token cannot read another session result', async () => {
  const service = makeService();
  const queued = await queueOneJob(service);
  await service.nextJob(token);
  await service.submitResult(token, {
    jobId: queued.jobId,
    output: solveSystem(input.matrix, input.vector),
  });

  await assert.rejects(
    () => service.getVerifiedResult('another_valid_token_123', queued.jobId),
    (error) => error.code === 'MATLAB_WORKER_UNAUTHORIZED',
  );
});

test('worker command only accepts a safe HTTPS or local API base', () => {
  assert.match(buildWorkerCommand(apiBase, token), /flowmetrica_worker\('https:/);
  assert.match(
    buildWorkerCommand('http://localhost:3001/api/matlab/worker', token),
    /flowmetrica_worker\('http:\/\/localhost:3001/,
  );
  assert.throws(
    () => buildWorkerCommand('http://example.com/api', token),
    (error) => error.code === 'INVALID_API_BASE',
  );
});
