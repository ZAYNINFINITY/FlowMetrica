# FlowMetrica — 4-slide presentation

Simple script for a short demo. One idea per slide, no jargon on the screen.
Detailed version: [README](../README.md). Roman Urdu pitch: [PDF](FlowMetrica-Pitch-RomanUrdu.pdf).

---

## Slide 1 — What is FlowMetrica?

**On screen**

> A small offline lab that turns a network story into an equation,
> solves it, and shows where the answer came from.

- Works with no internet, no login, no setup
- 13 ready-made network stories
- Built for learning and for showing the math, not hiding it

**Say:** "Network traffic looks messy, but conservation rules turn it into a few equations. This app makes that visible."

---

## Slide 2 — How it works

**On screen**

> **Story → Equation → Reduce → Answer + Source**

1. Pick a scenario (fixed JSON)
2. The server builds `A·x = b`
3. Row reduction gives rank, pivots and the solution
4. The answer comes back with an honest label

One shared entry point: `POST /api/execute`. The browser never does the math.

**Say:** "Everything goes through one door. That is why the three modules cannot disagree with each other."

---

## Slide 3 — Three modules

**On screen**

| Module | Question | What you see |
|---|---|---|
| **Traffic Analysis** | How should demand split across links? | Flow vector, matrix steps, topology |
| **Anomaly Detection** | Do the readings add up? | Inconsistency, simulated backup route |
| **Investigation** | What does an incident really prove? | Rank/pivots, structured report |

**Say:** "Same question at three depths: plan a healthy network, catch a broken one, then write up a real-looking incident."

---

## Slide 4 — Why linear algebra, and why MATLAB?

**On screen**

> Network flow is conservation. Conservation is a system of equations.

- Rows = junctions; unknowns = link flows
- Rank and pivots say: unique, impossible, or many answers
- MATLAB verifies exports independently — it is not a live cloud runner
- Saved result means saved result. Never called "live" unless it really ran live

**Say:** "MATLAB is here as an independent checker, not as a magic API. The honesty of the label is part of the project."

---

### Demo order (optional)

1. `#/overview` — show the one-line flow
2. `#/module1` — open a scenario, show matrix → RREF → solution
3. `#/module2` — show an inconsistent case
4. `#/module3` — show one incident report
5. `#/settings` — show preferences, guarantees and developer links
