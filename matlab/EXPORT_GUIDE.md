# MATLAB integration guide

There are two honest ways to involve MATLAB. They are different and must never be
labelled the same way.

| Mode | What it actually is | Label in the app |
|---|---|---|
| **Live REST bridge** | Desktop MATLAB executes a function during an API request | `Live MATLAB Result` |
| **Online export** | MATLAB Online runs `export_fixtures`, app loads saved JSON | `Saved MATLAB Result` |

MATLAB Online (including the free 20 hours/month account) does **not** expose a
supported general-purpose execution API. The app never automates a browser session
or pretends an exported fixture is a live call.

## A. Live bridge (desktop MATLAB only)

1. In desktop MATLAB, from the project folder:

   ```matlab
   addpath(genpath('matlab'))
   info = start_rest_service()
   ```

2. MATLAB prints three values. Export them into the environment that starts the
   Node server (quote values that contain special characters):

   ```powershell
   $env:MATLAB_REST_URL = '<RequestUrl from MATLAB>'
   $env:MATLAB_REST_TOKEN = '<RESTPersonalAccessToken from MATLAB>'
   $env:MATLAB_REST_CA = '<CertificateLocation from MATLAB>'
   npm start
   ```

   Optional: `MATLAB_REST_TIMEOUT_MS` (default `15000`).

3. Confirm:

   ```powershell
   Invoke-RestMethod http://localhost:3001/api/health | Select-Object -ExpandProperty services
   ```

   `matlabLive.configured` is `true` immediately; `matlabLive.available` becomes
   `true` only after a successful call. A configured bridge that fails returns an
   explicit error — it never silently swaps in a saved result.

4. The app also exposes static guidance at `GET /api/matlab/setup` (no secrets).

Rules: HTTPS only, token sent in the `mwRESTPersonalAccessToken` header, custom CA
from `MATLAB_REST_CA`, no token logging, no filesystem writes by the bridge.

## B. MATLAB Online verification / export (free 20 hr/month)

1. Sign in to MATLAB Online and upload this project folder.
2. In the Command Window:

   ```matlab
   addpath(genpath('matlab'))
   export_fixtures
   ```

3. The script reads `server/data/scenarios/*.json`, calls the matching entry point,
   and overwrites `server/data/fixtures/*.json`.
4. Restart the Node server. `result_source` becomes `matlab_fixture`, and the UI
   badge shows **Saved MATLAB Result**. This is a genuine MATLAB result, but it is
   still a saved result, not a live measurement.

### C. One-off handoff when MATLAB Drive cannot write into the local project

MATLAB Online writes into MATLAB Drive, not into the local project folder. To move one
genuine result across, print JSON in the Command Window and paste it into the matching
local fixture:

```matlab
A = [1 1 1; 1 -1 0; 0 1 -1];
b = [110; 60; 10];                 % must match the scenario execution.input exactly
[R, p] = rref([A b]);
inc = any(all(abs(R(:,1:3)) < 1e-9, 2) & abs(R(:,4)) > 1e-9);
o = struct();
o.classification = 'unique';       % classify from inc and numel(p) in a real export
o.consistent = ~inc;
o.rref = R;
o.rank = numel(p);
o.variableCount = 3;
o.pivotColumns = p - 1;            % app uses zero-based indices
o.solution = [80 20 10];
o.steps = {};                      % MUST assign after struct(), see trap below
o.parametricForm = {};
fprintf('FLOW_RESULT:%s\n', jsonencode(o))
```

Copy the `FLOW_RESULT:` line into
`server/data/fixtures/<scenario_id>.<operation>.json` as the `output` object, set
`metadata.executionEngine` to `MATLAB`, `verificationStatus` to `matlab_verified` and
`matlabExportStatus` to `complete`, then restart the server.

**MATLAB struct trap:** `struct('steps', {})` creates an empty *struct array*, so
`jsonencode` returns `[]` and the whole struct can collapse to `[]`. Always build the
struct first (`o = struct()`) and assign cell fields afterwards. This was observed and
fixed during the verified R2026b handoff.

## Quick manual verification

```matlab
A = [1 1; 1 -1];
b = [100; 20];
solve_network_flow(A, b)
% expected solution: [60; 40], RREF: [1 0 60; 0 1 40]

A = [1 1 1; 1 -1 0; 0 1 1];
b = [120; 20; 70];
solve_network_flow(A, b)
% expected solution: [50; 30; 40]
```

## Rules

- Never invent fixture numbers and call them MATLAB output. A handoff is only honest
  when the JSON was printed by MATLAB and the fixture input still matches the scenario.
- If teaching step annotations are retained from the reference implementation while
  the math comes from MATLAB, disclose that split in `metadata.method`.
- Keep `fixtureVersion` aligned with scenario input changes.
- If a scenario input changes, re-run both `npm run fixtures:generate` and
  `export_fixtures`, then verify the values match before committing.
- Never commit `MATLAB_REST_TOKEN`, the certificate, or a screenshot containing them.
