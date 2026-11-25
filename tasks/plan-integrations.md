# Implementation Plan: MATLAB Bridge + Ookla Live Measurement

## Overview
Add two opt-in integrations without breaking the offline-first core: an honest MATLAB REST bridge for users who can host a MATLAB REST Function Service, plus a real Ookla speed test in Module 1 whose measured values feed the shared math executor. MATLAB Online remains a documented handoff, not a fake live execution.

## Architecture Decisions
- **One math entry point stays intact.** `POST /api/execute` gains one operation, `solve_live_measurement`; the browser never computes math.
- **MATLAB bridge is opt-in.** Enabled only when `MATLAB_REST_URL` and `MATLAB_REST_TOKEN` are set. `matlab/start_rest_service.m` prints the exact values to paste. No credentials or tokens are ever stored in the repo.
- **Honest fallback.** If the bridge is absent or fails, predefined scenarios keep returning `reference_verified_fixture`. A bridge failure returns an explicit error — it never silently becomes a "live" result.
- **Measurement values are server-owned.** `/api/measure` returns an opaque `measurementId`; `/api/execute` looks up the measured Mbps server-side. Clients cannot inject invented numbers and get a `Live Network Measurement` label.
- **Offline stays first.** All 12 predefined scenarios and fixtures work with no internet. Live features report `unavailable` instead of fake data.
- **UI wiring follows the backend.** The UI engineer team receives the new API contract after backend verification; no half-finished controls are exposed.

## API Contracts

### `GET /api/matlab/setup`
```json
{
  "status": "success",
  "bridge": { "available": false, "reason": "...", "configured": false },
  "instructions": ["..."],
  "setupCode": "% run inside MATLAB ..."
}
```
Static, safe, contains no secrets.

### `POST /api/measure`
Request: `{}`  
Success: `{ "status": "success", "measurement": { "id": "...", "downloadMbps": 94.5, "uploadMbps": 88.2, "pingMs": 15.3, "jitterMs": 2.1, "packetLoss": 0, "server": {...}, "isp": "...", "measuredAt": "..." } }`  
Failure: `{ "status": "unavailable", "error": { "code": "MEASUREMENT_UNAVAILABLE", "message": "..." } }`  
Concurrency: one test at a time → `MEASUREMENT_IN_PROGRESS`.

### `POST /api/execute` — new operation
```json
{
  "module": "module1",
  "scenario_id": "network_traffic_live",
  "operation": "solve_live_measurement",
  "input": { "measurementId": "<from /api/measure>", "matrix": [[1,1],[1,-1]] }
}
```
Response adds `result_source: "live_network_measurement"`, `execution_engine: "reference_javascript_gauss_jordan"`, `measurement: { ... }`, `live_execution_available: false` (MATLAB is a separate flag).

## Task List

### Phase A — MATLAB bridge

**Task 1: Make MATLAB entry points return the app's result shape**
- Update `matlab/common/*.m` and `matlab/module*/*.m` so each returns `classification`, `consistent`, `rref`, `rank`, `variableCount`, `pivotColumns`, `solution`, `steps`, `parametricForm`.
- Add `matlab/start_rest_service.m` that starts `RESTFunctionService`, adds the folders to the path, and prints URL/token/cert location.
- Acceptance: scripts are syntactically consistent with the existing `.m` style; guide explains that MATLAB Online cannot host this service.
- Verify: read-through; no MATLAB binary exists here, so do not claim execution.

**Task 2: Add the bridge service**
- New `server/services/matlab-bridge.js`: status from env, `callMatlabFunction`, response normalization, timeout, no token logging.
- Acceptance: unconfigured → `{ available:false }`; malformed third-party response → explicit error; valid response → normalized result.
- Verify: focused tests.

**Task 3: Wire bridge into executor, health and setup route**
- `createExecutor({ fixtureStore, matlabBridge })`; `getHealth({ ..., matlabBridge })`; new `GET /api/matlab/setup`.
- Acceptance: with no bridge, all 12 predefined scenarios behave exactly as before; with a stub bridge, one scenario returns `live_matlab_execution`.
- Verify: `npm test`.

### Phase B — Ookla

**Task 4: Add measurement service and store**
- Install `universal-speedtest`; normalize results; in-memory store with TTL and concurrency guard.
- Acceptance: finite, rounded metrics; offline failure returns `unavailable`; no fabricated fallback.
- Verify: focused tests with an injected runner.

**Task 5: Add `/api/measure` and the `solve_live_measurement` path**
- New route, validator branch, executor branch using `solveSystem(matrix, [downloadMbps, uploadMbps])`.
- Acceptance: unknown/expired measurement id → `MEASUREMENT_NOT_FOUND`; provenance is always `live_network_measurement`; MATLAB live flag stays false unless bridge configured.
- Verify: API smoke + tests.

**Task 6: Update capabilities and health**
- `networkMeasurement.available` becomes true when Ookla runner loads; `matlabLive.available` reflects bridge status.
- Acceptance: UI can show separate, truthful indicators.
- Verify: `/api/health` smoke.

### Checkpoint: Backend complete
- [ ] `npm test` all pass
- [ ] `npm run build` succeeds
- [ ] Health shows 12 scenarios, 12 fixtures, honest bridge/measurement flags

**Task 7: UI contract handoff**
- Send the UI engineer team the exact new endpoints, payloads, provenance labels and unavailable states.
- Acceptance: Module 1 gets a real "Run speed test" action and live result view; MATLAB setup panel gets real open/copy actions; no dead buttons.

**Task 8: Browser verification**
- Verify offline predefined flow, live measurement happy path (if internet allows), honest unavailable path, and zero console errors.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| MATLAB Online cannot host REST service | High | Opt-in bridge + documented handoff; never claim live for Online. |
| Ookla network blocked in this environment | Med | Injectable runner + tests; UI reports `unavailable` honestly. |
| Client fakes measured Mbps | High | Server-owned measurement id; vector built server-side. |
| UI team edits frontend concurrently | Med | Backend first, handoff after verification; no overlapping file edits. |
| New operation breaks fixture generator | Med | Live operation is excluded from scenario/fixture files; generator untouched. |

## Open Questions
None — both integration routes were confirmed by the user.
