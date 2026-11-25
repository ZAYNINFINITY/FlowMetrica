import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { noStore } from './middleware/no-store.js';
import { createExecuteRouter } from './routes/execute.js';
import { createHealthRouter } from './routes/health.js';
import { createMatlabRouter } from './routes/matlab.js';
import { createMeasurementRouter } from './routes/measurement.js';
import { createScenariosRouter } from './routes/scenarios.js';
import { createExecutionMode } from './services/execution-mode.js';
import { createExecutor } from './services/executor.js';
import { createFixtureStore } from './services/fixtures.js';
import { getHealth } from './services/health.js';
import { createMatlabBridge } from './services/matlab-bridge.js';
import { createMeasurementStore, createOoklaRunner } from './services/measurement.js';
import { createScenarioStore } from './services/scenarios.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(currentDir, 'data');
const rootDir = path.resolve(currentDir, '..');

const fixtureStore = createFixtureStore(path.join(dataDir, 'fixtures'));
const scenarioStore = createScenarioStore(path.join(dataDir, 'scenarios'));
const matlabBridge = createMatlabBridge({ env: process.env });

// Loading the optional measurement library must never block the offline core.
let ooklaRunner = null;
try {
  ooklaRunner = await createOoklaRunner();
} catch {
  ooklaRunner = null;
}
const measurementStore = createMeasurementStore({ runner: ooklaRunner });
const executionMode = createExecutionMode();
const executor = createExecutor({ fixtureStore, matlabBridge, measurementStore, executionMode });

const app = express();
const port = Number(process.env.PORT ?? 3001);
const isServerless = process.env.VERCEL === '1';

// Conditional GETs must not turn live API state into a 304. Static files keep their
// own cache headers through express.static, so only JSON responses are affected.
app.set('etag', false);
app.use('/api', noStore);
app.use(express.json({ limit: '64kb' }));
app.use('/api/health', createHealthRouter(() =>
  getHealth({ fixtureStore, scenarioStore, matlabBridge, measurementStore, executionMode }),
));
app.use('/api/scenarios', createScenariosRouter(scenarioStore));
app.use('/api/execute', createExecuteRouter(executor));
app.use('/api/measure', createMeasurementRouter(measurementStore));
app.use('/api/matlab', createMatlabRouter(matlabBridge, executionMode));

// On Vercel the platform serves dist/ directly; importing this module must not
// try to read a build folder that lives outside the function bundle.
if (!isServerless) {
  const distDir = path.join(rootDir, 'dist');
  app.use(express.static(distDir));
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api/')) return next();
    return response.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((error, _request, response, _next) => {
  const isJsonError = error instanceof SyntaxError && 'body' in error;
  response.status(isJsonError ? 400 : 500).json({
    status: 'error',
    error: { code: isJsonError ? 'INVALID_JSON' : 'SERVER_ERROR', message: 'The request could not be processed.' },
  });
});

export default app;

// Only a direct `node server/index.js` run starts a listener; the Vercel function
// imports the same app and is invoked by the platform instead.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain && !isServerless) {
  app.listen(port, () => {
    const matlab = matlabBridge.status();
    console.log(`[FlowMetrica] API listening on http://localhost:${port}`);
    console.log(`[FlowMetrica] ${scenarioStore.count} scenarios, ${fixtureStore.size} saved results`);
    console.log(`[FlowMetrica] MATLAB bridge: ${matlab.configured ? (matlab.available ? 'live' : 'configured') : 'offline'}`);
    console.log(`[FlowMetrica] Ookla measurement: ${ooklaRunner ? 'ready' : 'unavailable'}`);
    fixtureStore.problems.forEach((problem) => {
      console.warn(`[fixtures] rejected ${problem.file}: ${problem.reason}`);
    });
  });
}
