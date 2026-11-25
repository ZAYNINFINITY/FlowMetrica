# Live integration contract (backend → UI)

Backend is implemented and verified. These endpoints are ready for UI wiring.
Do not compute math in the browser: every result still comes from `POST /api/execute`.

## 1. `POST /api/measure` — real Ookla speed test

Request body: `{}`. Takes 20–60 seconds. Only one test may run at a time.

Success `200`:

```json
{
  "status": "success",
  "measurement": {
    "id": "ab8f4d4c-f398-4864-b905-cac3e4e612ea",
    "downloadMbps": 42.41,
    "uploadMbps": 23.91,
    "pingMs": 9.7,
    "jitterMs": 1.8,
    "packetLoss": 0,
    "server": { "name": "Islamabad", "country": "Pakistan", "sponsor": "..." },
    "isp": "Example ISP",
    "measuredAt": "2026-11-25T..."
  }
}
```

Failure `503` / `409`:

```json
{ "status": "unavailable", "error": { "code": "MEASUREMENT_UNAVAILABLE", "message": "..." } }
```

Codes: `MEASUREMENT_UNAVAILABLE`, `MEASUREMENT_IN_PROGRESS`, `MEASUREMENT_INVALID_RESULT`.

## 2. `POST /api/execute` — live measurement analysis

The 2×2 matrix is a **teaching model**: row 1 is total measured download, row 2 is
the measured upload difference. Explain this in the UI; it is not a physical law.

```json
{
  "module": "module1",
  "scenario_id": "network_traffic_live",
  "operation": "solve_live_measurement",
  "input": {
    "measurementId": "ab8f4d4c-f398-4864-b905-cac3e4e612ea",
    "matrix": [[1, 1], [1, -1]]
  }
}
```

Never send `input.vector` — the server rejects it (`INVALID_INPUT`).

Success adds:

```json
{
  "result_source": "live_network_measurement",
  "execution_engine": "reference_javascript_gauss_jordan",
  "verification_status": "measured_live",
  "applied_vector": [42.41, 23.91],
  "measurement": { "...": "same object as /api/measure" },
  "live_execution_available": false
}
```

Use the existing result renderer (`result.rref`, `steps`, `solution`,
`parametricForm`) — no new math view needed. Badge label: **Live Network Measurement**.
Unknown/expired id → `503 MEASUREMENT_NOT_FOUND`.

## 3. `GET /api/matlab/setup` — static guidance, no secrets

```json
{
  "status": "success",
  "bridge": { "configured": false, "available": false, "reason": "...", "verifiedAt": null },
  "instructions": ["4 setup steps"],
  "setupCode": "% MATLAB commands + env var names",
  "matlabOnlineHandoff": ["4 export steps"]
}
```

This endpoint never echoes a token or certificate. It is safe to render raw.

## 4. `GET /api/health` — status flags

```json
{
  "services": {
    "matlabLive": {
      "available": false,
      "configured": false,
      "verifiedAt": null,
      "reason": "..."
    },
    "networkMeasurement": { "available": true, "label": "Live measurement", "reason": "..." },
    "scenarios": { "count": 12 },
    "savedResults": { "count": 12, "problems": [] }
  }
}
```

- `matlabLive.available` becomes true only after a successful REST call.
- `networkMeasurement.available` reflects whether the Ookla runner loaded.

### Current fixture state

`incident_capacity_breach_01` now returns `result_source: matlab_fixture` and shows the
**Saved MATLAB Result** badge: its math was computed with MATLAB Online R2026b and the
JSON was copied into the local fixture. `live_execution_available` stays `false` — this
is not a live call. The other 11 scenarios remain `reference_verified_fixture`.

## Provenance labels the UI may show

`Live MATLAB Result`, `Saved MATLAB Result`, `Saved Result · Reference-Verified`,
`Live Network Measurement`, `Simulated Network Scenario`, `AI-Proposed Model`,
`Template-Based Report`.

Never show a live label for a saved fixture. Never add OpenRouter or fake live
measurement controls. Unavailable states must stay explicit.

## Suggested Module 1 flow

1. Show the 4 predefined scenarios as today (fully offline).
2. A clearly separated "Live measurement" card: `Run speed test` → `/api/measure`.
3. While running: progress state; on failure: show the server message, no numbers.
4. On success: render measured metrics + badge `Live Network Measurement`, then
   call `/api/execute` with the id and the fixed 2×2 teaching matrix.
5. Reuse the step list / RREF / topology views. Keep predefined scenarios untouched.
