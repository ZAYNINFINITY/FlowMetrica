# Implementation Plan: Scenario Library Expansion (5 → 12)

## Overview
Add seven predefined scenarios so each of the three modules has four offline cases. Every new case reuses the existing `POST /api/execute` contract and the three existing operations; no server code, UI code, or dependency changes are required.

## Architecture Decisions
- **JSON-only expansion.** `createScenarioStore` already reads every `server/data/scenarios/*.json`, so new files are discovered automatically. Zero code changes in routes/services.
- **Reuse three operations.** `solve_network_flow`, `analyze_anomaly`, `investigate_incident`. No new operation type, validator branch, or MATLAB entry point.
- **Stage ids stay `normal` / `failed` / `corrected`.** The anomaly UI already keys on these ids, so new anomaly cases render without frontend edits.
- **Verified fixtures, not MATLAB claims.** `scripts/generate-reference-fixtures.mjs` already iterates all scenarios and cross-checks `verification`. New fixtures keep `result_source = reference_verified_fixture`.
- **Topology statuses limited to `normal` / `failed` / `restored`** — the only statuses the existing network renderer styles.

## Scenario Catalogue

| Module | New id | Concept | Expected result |
|---|---|---|---|
| M1 | `network_traffic_03` | Underdetermined two-path merge (3 unknowns, 2 equations) | `infinite_solutions` |
| M1 | `network_traffic_04` | Four-router core mesh, full rank | `unique [20, 30, 40, 50]` |
| M2 | `anomaly_redundant_sensor_01` | Redundant sensor masks a failure | `infinite → no_solution → unique` |
| M2 | `anomaly_inconsistent_flow_01` | Conflicting flow readings after a link loss | `unique → no_solution → unique` |
| M2 | `anomaly_capacity_breach_01` | Aggregation link forced to zero; backup route modelled | `unique → no_solution → unique` |
| M3 | `incident_capacity_breach_01` | INC-318: unique split where one link exceeds capacity | `unique [80, 20, 10]` |
| M3 | `incident_contradictory_sensors_01` | INC-402: duplicate sensors disagree | `no_solution` |

Final counts: M1 = 4, M2 = 4, M3 = 4, total = 12.

## Task List

### Task 1: Add two Module 1 scenarios
**Description:** Create the underdetermined and four-router scenario JSON files with variables, equations, topology, execution input, verification and teaching notes.
**Acceptance criteria:**
- [ ] Both files parse as JSON and match the existing scenario schema.
- [ ] IDs are unique and match the validator's id pattern.
- [ ] `verification` contains classification plus solution for the unique case.
**Verification:** `node -e "JSON.parse(...)"` on both files; fixture generator verifies expected values.
**Dependencies:** None
**Files:** `server/data/scenarios/network_traffic_03.json`, `server/data/scenarios/network_traffic_04.json`
**Estimated scope:** S

### Task 2: Add three Module 2 anomaly scenarios
**Description:** Create three normal/failed/corrected cases with distinct failure mechanics and honest "simulation" teaching notes.
**Acceptance criteria:**
- [ ] Each has exactly three stages with ids `normal`, `failed`, `corrected`.
- [ ] Failed stage reduces to `no_solution`; corrected stage is valid.
- [ ] Topologies use only known edge statuses and every edge references an existing node.
**Verification:** Fixture generator checks `expectedClassifications` per stage.
**Dependencies:** None
**Files:** three new JSON files under `server/data/scenarios/`
**Estimated scope:** M

### Task 3: Add two Module 3 incident scenarios
**Description:** Create a capacity-breach incident and a contradictory-sensor incident with findings and suggested actions.
**Acceptance criteria:**
- [ ] Both include `incidentId`, `severity`, `investigationSteps`, `templateFindings`, `suggestedActions`.
- [ ] Expected classifications are declared and independently verified.
**Verification:** Fixture generator output; API execute smoke test per incident.
**Dependencies:** None
**Files:** two new JSON files under `server/data/scenarios/`
**Estimated scope:** S

### Checkpoint: Catalogue complete
- [ ] `/api/scenarios` returns 12 scenarios (4 per module).
- [ ] No server or frontend source file was modified.

### Task 4: Regenerate and verify all fixtures
**Description:** Run the existing generator so seven new verified fixtures are written alongside the original five.
**Acceptance criteria:**
- [ ] Generator reports 12 fixtures written with zero verification errors.
- [ ] New fixtures carry `verificationStatus: reference_verified` and `matlabExportStatus: pending`.
- [ ] No fixture is labelled as MATLAB output.
**Verification:** `npm run fixtures:generate`.
**Dependencies:** Tasks 1–3
**Files:** seven new files under `server/data/fixtures/`
**Estimated scope:** XS

### Task 5: Add a catalogue integrity test
**Description:** Guard the expansion against silent drift: correct counts, per-module balance, fixture presence, and honest provenance.
**Acceptance criteria:**
- [ ] Test fails if any module has fewer than 4 scenarios or if total ≠ 12.
- [ ] Test executes one scenario per module through the real executor and asserts non-fabricated provenance.
**Verification:** `npm test`.
**Dependencies:** Task 4
**Files:** `server/services/catalog.test.js` (new)
**Estimated scope:** S

### Checkpoint: Verified
- [ ] `npm test` all pass
- [ ] `npm run build` succeeds
- [ ] API health reports 12 scenarios, 12 saved results, zero fixture problems
- [ ] Browser check: all new scenarios selectable and executable

### Task 6: Update documentation
**Description:** Reflect the expanded library in README without changing provenance language.
**Acceptance criteria:**
- [ ] README states 12 predefined scenarios (4 per module).
**Verification:** Read-through.
**Dependencies:** Task 5
**Files:** `README.md`
**Estimated scope:** XS

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| UI team edits frontend concurrently | Med | This plan touches only `server/data/`, one new test and README. No shared source file is edited. |
| New math expected values wrong | High | Every scenario declares `verification`; generator throws before writing a fixture if it disagrees. |
| Anomaly stage ids mismatch UI | Med | Reuse existing `normal` / `failed` / `corrected` ids exactly. |
| Fixture hash mismatch at runtime | Med | Generator writes `execution.input` verbatim into fixture input; no manual hash editing. |
| MATLAB export script misses new scenarios | Low | Export script already loops over all scenario JSON files and uses the same three operations. |

## Open Questions
None — scope, distribution and constraints were confirmed by the user.
