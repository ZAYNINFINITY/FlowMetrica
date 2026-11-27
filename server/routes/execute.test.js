import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';

import { createExecuteRouter } from './execute.js';

/** Boots the real router on an ephemeral port so HTTP status codes are real. */
async function postExecute(outcome) {
  const app = express();
  app.use(express.json());
  app.use('/api/execute', createExecuteRouter({ execute: async () => outcome }));

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/execute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ module: 'module1' }),
    });
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('worker_pending is HTTP 200 so the browser keeps polling', async () => {
  const { status, body } = await postExecute({
    status: 'worker_pending',
    jobId: 'job-1',
    state: 'queued',
  });

  assert.equal(status, 200);
  assert.equal(body.status, 'worker_pending');
  assert.equal(body.state, 'queued');
});

test('a failed execution still uses an HTTP error status', async () => {
  const { status, body } = await postExecute({
    status: 'error',
    error: { code: 'MATLAB_WORKER_FAILED', message: 'Rejected.' },
  });

  assert.equal(status, 400);
  assert.equal(body.error.code, 'MATLAB_WORKER_FAILED');
});
