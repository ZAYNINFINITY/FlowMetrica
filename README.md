# FlowMetrica

Offline-first educational network analysis lab. Three independent modules share one
JSON execution interface and one saved-result repository.

## Run

```bash
npm install
npm run dev          # API on :3001, Vite on :5173
npm test             # math + execution interface tests
npm run build        # dist/ served by Express on :3001
npm start            # production-style single origin
```

Open `http://localhost:5173` in dev, or `http://localhost:3001` after a build.

## What works offline

- Module 1: four predefined network flows (unique, underdetermined and a
  4-router mesh), matrices, Gaussian elimination steps, RREF, solution vector
  and SVG topology.
- Module 2: four anomaly cases (link failure, redundant sensor, inconsistent
  readings and capacity breach), inconsistent-system detection, simulated
  backup-route correction, before/after topologies.
- Module 3: five predefined incidents (unique, infinite, no-solution, capacity
  breach and hostel core saturation), RREF-based investigation, template report
  generation and localStorage report history.
- Dashboard, status bar, scenario metadata and all 13 verified saved results.

All 13 scenarios work with no internet. Live features are additive and opt-in.

## Optional live integrations

| Feature | Requirement | Honest behaviour when unavailable |
|---|---|---|
| Ookla speed test | Internet access to speedtest.net | `MEASUREMENT_UNAVAILABLE`, no invented numbers |
| MATLAB live calls | Desktop MATLAB REST Function Service + env vars | Saved results still work; configured failures return an explicit error |
| MATLAB Online verification | Free MathWorks account (20 hr/month) | Export saved fixtures, labelled `Saved MATLAB Result` |

Full setup: `matlab/EXPORT_GUIDE.md`. API contract for UI work: `docs/INTEGRATIONS.md`.

Environment variables for the MATLAB bridge (never commit them):

```text
MATLAB_REST_URL        https://localhost:9920/matlab/feval/v1/FlowMetrica
MATLAB_REST_TOKEN      <printed by start_rest_service>
MATLAB_REST_CA         <certificate path printed by start_rest_service>
MATLAB_REST_TIMEOUT_MS 15000   (optional)
```

## Result provenance (important)

`POST /api/execute` always returns `result_source`:

| Value | Meaning |
|---|---|
| `reference_verified_fixture` | Current default. Computed by the independent reference implementation and cross-checked against expected values. **Not** a MATLAB result. |
| `matlab_fixture` | Genuine MATLAB export. Currently `INC-318 · Edge Capacity Breach` was computed in MATLAB Online R2026b and copied back into its fixture. Still a saved result, not a live call. |
| `live_matlab_execution` | A real REST call to a configured desktop MATLAB service. Never claimed without execution. |
| `live_network_measurement` | Real Ookla Mbps fed into the shared math solver on the server. |
| `simulated_data` | Teaching model, not a measurement. |
| `template_generated` | Report assembled locally from verified values. |

MATLAB Online has no supported general-purpose execution API. The app never
automates a browser session or calls an exported fixture "live".

## Architecture

```
src/                     React UI (hash routing, no router dependency)
server/routes/           /api/health, /api/scenarios, /api/execute,
                         /api/measure, /api/matlab/setup
server/services/         shared executor, validator, fixtures, matrix core,
                         MATLAB REST bridge, Ookla measurement store
server/data/scenarios/   12 versioned scenario definitions (JSON, 4 per module)
server/data/fixtures/    12 versioned result fixtures (JSON)
matlab/                  MATLAB entry points, REST starter, export scripts
                         matlab/incoming/ stages ChatGPT-authored scenarios until
                         MATLAB has signed a matching fixture
scripts/                 reference fixture generator
docs/UI-UX-SPEC.md       design specification
docs/INTEGRATIONS.md     live integration API contract
```

All three modules call the same `POST /api/execute` endpoint. Input validation and
result validation are shared; a module never implements its own math pipeline.
Measured vectors are built server-side from an opaque measurement id, so a client
cannot attach a `live_network_measurement` label to invented numbers.

## Tests

`npm test` runs 38 tests covering linear algebra, input purity, row operations,
catalogue integrity, provenance, MATLAB REST decoding, measurement normalisation,
concurrency, expiry and live-execution failure paths.

## Deliberately out of scope

OpenRouter AI, browser automation of MATLAB Online, authentication, cloud sync,
charts and animation libraries. No dead placeholder buttons exist for them.
