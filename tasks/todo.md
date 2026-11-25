# Todo — Scenario Library Expansion (5 → 12) — COMPLETE

- [x] Task 1: Add two Module 1 scenarios (`network_traffic_03`, `network_traffic_04`)
- [x] Task 2: Add three Module 2 anomaly scenarios (redundant sensor, inconsistent flow, capacity breach)
- [x] Task 3: Add two Module 3 incident scenarios (capacity breach, contradictory sensors)
- [x] Checkpoint: `/api/scenarios` returns 12 scenarios, 4 per module
- [x] Task 4: Regenerate all fixtures (12 written, zero verification errors)
- [x] Task 5: Add `server/services/catalog.test.js` integrity test
- [x] Checkpoint: `npm test` 16/16 + `npm run build` + API health smoke
- [x] Task 6: Update README to state 12 scenarios
- [x] Final: browser verify new scenarios across all three modules (zero console errors)
