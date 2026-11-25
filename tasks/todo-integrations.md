# Todo — MATLAB Bridge + Ookla Live Measurement

## Phase A — MATLAB bridge

- [x] Task 1: MATLAB entry points return the app's full result shape (`solve_system.m`, `gaussian_steps.m`, `parametric_form.m`, `analyze_anomaly.m`)
- [x] Task 1b: `matlab/start_rest_service.m` prints URL, token path and CA path
- [x] Task 2: `server/services/matlab-bridge.js` — opt-in HTTPS REST client, token header, CA, timeout, large-notation decoding, zero-based pivots
- [x] Task 3: Wire bridge into executor, health and `GET /api/matlab/setup`

## Phase B — Ookla

- [x] Task 4: `server/services/measurement.js` — Ookla runner, normaliser, server-owned ids, TTL, concurrency guard
- [x] Task 5: `POST /api/measure` + `solve_live_measurement` executor path
- [x] Task 6: Health flags for bridge and measurement

## Checkpoint

- [x] `npm test` → 37/37 pass
- [x] `npm run build` → success
- [x] `/api/health` → 12 scenarios, 12 fixtures, 0 problems, 1 measurement runner, bridge offline
- [x] Real Ookla smoke → 42.41 down / 23.91 up / 9.7 ms ping, server Islamabad
- [x] Live solve smoke → `[33.16, 9.25]`, source `live_network_measurement`
- [x] Negative smokes → client vector rejected (400), unknown id unavailable (503), predefined scenario unchanged

### Dependency note

`npm audit --omit=dev` reports 2 **low** advisories from `universal-speedtest` →
`fast-xml-parser`. The only offered fix is a major downgrade to `universal-speedtest@1.0.2`,
which has a different API and would break the verified runner. Accepted for this MVP:
the advisory affects parsing of Ookla's server metadata only, and the offline core
never loads that dependency. Re-evaluate before any public deployment.

## Phase C — MATLAB Online (user session, verified)

- [x] User signed in to MATLAB Online in the shared browser; session confirmed on
  `matlab.mathworks.com` (Home showed 3.9 / 20 hours used).
- [x] MATLAB Online R2026b IDE opened and the real `rref` computation was run in the
  Command Window for `incident_capacity_breach_01` using its exact scenario input.
- [x] First attempt printed `FLOW_RESULT:[]` because `struct(...,'steps',{})` creates an
  empty **struct array**. Fixed by assigning fields individually. This is why
  `matlab/EXPORT_GUIDE.md` warns about the pattern.
- [x] Genuine MATLAB output: classification `unique`, rank `3`, RREF
  `[[1,0,0,80],[0,1,0,20],[0,0,1,10]]`, solution `[80,20,10]`.
- [x] Imported into `server/data/fixtures/incident_capacity_breach_01.investigate_incident.json`
  with `verificationStatus: matlab_verified`, `executionEngine: MATLAB`,
  `matlabExportStatus: complete`, `matlabVersion: R2026b (MATLAB Online)`.
  Teaching step annotations were retained from the reference run and that split is
  explicitly disclosed in `metadata.method`.
- [x] Import script asserts scenario input === MATLAB input before writing, so a result
  can never be labelled MATLAB for a different system.
- [x] `/api/execute` now returns `result_source: matlab_fixture`, `execution_engine: MATLAB`,
  `live_execution_available: false` for this scenario.
- [x] Browser verified on `#/module3` → INC-318 shows **Saved MATLAB Result**,
  RREF/solution rendered, **zero console messages**.

## Handoff

- [x] `docs/INTEGRATIONS.md` written with exact UI contract
- [x] UI engineer team dispatched for Module 1 live card + Settings MATLAB panel
- [x] Verify UI team diff — clean: `LiveMeasurementPanel.jsx` owns the state machine,
  `api.js` carries error codes without leaking raw server text, `SourceBadge` maps the
  exact server key, Settings panel renders no token, external link has
  `rel="noopener noreferrer"`, `tailwind.config.js` defines the `scan` keyframe.
- [x] Re-run tests + build after UI diff: `npm test` 37/37, `npm run build` success
- [x] Browser smoke: Module 1 live Ookla run (UI team), Settings static MATLAB guidance,
  Module 3 genuine MATLAB badge (supervisor)
- [x] Final: proceed to Phase 5 review/security only after UI result is verified
