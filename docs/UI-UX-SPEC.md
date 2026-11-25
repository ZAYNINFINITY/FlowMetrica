# FlowMetrica — UI/UX, Visual Design & Frontend Specification

**Frontend:** React + Vite + Tailwind CSS
**Primary target:** Desktop and laptop (tablet/mobile must remain usable)
**Design direction:** Dark Scientific / Network Intelligence Interface (NOC dashboard, scientific computing, cybersecurity investigation). Must NOT look like a generic admin panel or university CRUD project.

---

## 1. Objectives

Clear navigation; professional network visualizations; readable mathematical representations; consistent module layouts; interactive data presentation; clear online/offline status; responsive behavior.

Inspiration only (do not copy assets or templates): Dribbble network monitoring / network dashboard / network security / incident management tags, React Flow examples, shadcn dashboard + sidebar blocks, Tailwind dark mode. Keep reference URLs documented. No random reference images as backgrounds.

## 2. Visual identity

Exact palette:

| Element | Hex |
|---|---|
| Main background | `#080D16` |
| Secondary background | `#0D1522` |
| Sidebar background | `#0A111D` |
| Card background | `#111C2B` |
| Elevated surfaces | `#162337` |
| Primary accent | `#22D3EE` |
| Secondary accent | `#6366F1` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Error | `#EF4444` |
| Primary text | `#F1F5F9` |
| Secondary text | `#94A3B8` |
| Borders | `#243247` |

Semantics: cyan = connections/primary actions/selected; indigo = mathematical analysis; green = success/recovery; amber = warning/unusual; red = failed links/critical incidents; grey = inactive.

Background: dark navy, subtle radial gradients, very subtle technical grid, restrained shadows. Avoid excessive neon, large glowing borders, heavy glassmorphism, saturated backgrounds.

## 3. Typography

Inter for UI, JetBrains Mono for matrices/vectors/equations/numbers. Bundle fonts locally (`@fontsource/*`) so offline still works — no CDN fonts.

| Element | Size |
|---|---|
| Page title | 26–32px |
| Section title | 18–22px |
| Card title | 15–17px |
| Body | 13–15px |
| Secondary | 11–12px |
| Math values | 13–15px |

Matrices need aligned columns, consistent formatting, horizontal scroll on small screens.

## 4. Global layout

Persistent **sidebar** (left) + **topbar** + main workspace.

Sidebar contains: FlowMetrica logo/name, Dashboard, Network Traffic Analysis, Anomaly Detection, Incident Investigation, Saved Investigations, Settings. Collapsible, active highlighting, consistent Lucide icons, hover states, tooltips when collapsed, responsive.

Topbar: current page title, breadcrumb, internet indicator, MATLAB availability indicator, OpenRouter availability indicator where relevant, settings/profile access. Internet and MATLAB must be shown separately.

Workspace: consistent margins, responsive grids, reusable cards, clear section separation, appropriate scrolling.

## 5. Dashboard

Header: **FlowMetrica**, tagline **Network Intelligence & Mathematical Analysis**, description "Explore network traffic, analyze anomalies, and investigate network incidents through mathematical modeling."

Three prominent module cards:

1. **Network Traffic Analysis** — connected nodes, traffic paths, cyan links. Description: "Analyze network flows, traffic distribution, matrices and network topologies."
2. **Network Anomaly Detection** — topology with highlighted failed links and alternative routes. Description: "Identify network inconsistencies, simulate link failures and explore recovery solutions."
3. **Incident Investigation** — investigation panels, status indicators, report preview. Description: "Investigate network incidents through mathematical analysis and structured reports."

Supporting elements: recent investigations, available predefined scenarios, service status, quick access to saved results. **Never invent live network statistics.**

## 6. Module 1 — Network Traffic Analysis

Landing title/description: "Network Traffic Analysis" / "Visualize network structures and explore mathematical traffic distribution."

Two mode cards:
- **A. Predefined Analysis**: scenario selection, topology preview, description, model info, Open Scenario action.
- **B. Real-Time Measurement**: download/upload/latency/packet loss, online requirement indicator. This is OUT OF SCOPE for current MVP → show a clear unavailable status card, never a fake Start button.

Scenario cards show: name, topology preview, node count, connection count, short description, complexity label, Open action.

Analysis workspace: two columns.
- Left: interactive network topology — routers/nodes, connections, traffic direction, link labels, node selection, zoom/pan controls.
- Right: tabs **Input Data / Matrix Representation / Gaussian Elimination / RREF / Final Solution**. Show coefficient matrix, augmented matrix, row-operation sequence, solution vector, result source.

Matrices monospace; augmented column visually separated; don't crowd all results into one card.

## 7. Module 2 — Anomaly Detection

Landing title: "Network Anomaly Detection" / "Identify network inconsistencies and explore mathematical recovery." Predefined cards: Link Failure, Traffic Imbalance, Inconsistent Flow, Alternative Routing (only scenarios that actually exist may be clickable).

Workspace: selected scenario, description, status, Run Analysis. Network topology with failed links red, affected nodes, alternative routes, math result panel.

Before/after comparison: Normal state vs Anomaly state. Recovery visualization: alternative routing, traffic redistribution, recovered connections, updated math. Restrained animation allowed. **Recovery must be labeled simulation, not physical repair.**

## 8. Module 3 — Incident Investigation

Landing title: "Incident Investigation" / "Investigate network incidents using mathematical analysis and structured reporting."

Two options:
- **A. Predefined Incident Investigation** — offline scenarios, descriptions, steps, math results, template reports.
- **B. Custom AI-Assisted Investigation** — textarea, category, Generate Model, proposed variables/equations/assumptions, review panel, Approve Model. OUT OF SCOPE for current MVP → show clear unavailable status, no fake controls.

Incident cards: ID, title, description, severity, related scenario, investigation status, Open action.

Results tabs: Incident Overview / Mathematical Model / Execution Results / AI Interpretation / Investigation Report. AI interpretation unavailable offline → label it, don't pretend.

Report document layout: incident ID, description, investigation summary, model, matrices/equations, findings, suggested actions, provenance, date. Print/export only if implemented. Offline reports labeled **template-generated**.

## 9. Shared design system

Sidebar, Topbar, Breadcrumb, ModuleCard, ScenarioCard, StatusBadge, MatrixViewer, ResultPanel, Tabs, Modal, Toast, Loading Skeleton, Empty State, Error State, Confirmation Dialog. Consistent styling and interaction patterns.

## 10. Network visualization

Most important visual element. Multiple nodes, directed/undirected connections, connection labels, traffic direction, node/link selection, zoom, pan, highlighting, failed connections, alternative routes, normal vs anomaly states. React Flow (`@xyflow/react`) is the preferred implementation library. Readable diagrams over decorative 3D graphics.

## 11. Animation and interaction

Subtle, meaningful: sidebar transitions, card hover, node selection highlight, traffic flow animation, link failure transition, traffic redistribution, matrix row-operation transitions, tab transitions, loading skeletons. All info must remain understandable with animations disabled. Respect `prefers-reduced-motion`. Framer Motion only if it adds genuine value.

## 12. Responsive

Desktop/laptop priority; tablet/mobile supported. Sidebar collapses; cards stack; canvas scrolls/zooms; math panels stack; matrices scroll horizontally; topbar adapts.

## 13. Accessibility

Contrast, readable sizes, clear labels, icon tooltips, keyboard navigation, visible focus, no color-only status, understandable errors, accessible controls.

## 14. Suggested structure

```
src/components/layout/    Sidebar, Topbar, MainLayout
src/components/common/    StatusBadge, ModuleCard, ScenarioCard, MatrixViewer, ResultPanel
src/components/visualization/ NetworkCanvas, NetworkNode, NetworkLink
src/pages/                Dashboard, Module1/*, Module2/*, Module3/*
src/hooks/ src/styles/ src/assets/ src/App.jsx
```
Organization is a proposal — do not break backend or math architecture.

## 15. Libraries

React, Vite, Tailwind, Lucide React (icons), React Flow (topology), Recharts/Chart.js only if a real chart is needed, Framer Motion optional, Inter + JetBrains Mono bundled. Avoid unnecessary/obsolete packages.

## 16. Acceptance criteria

Dashboard navigation works; three distinct module interfaces; consistent sidebar/topbar; scenario selection screens; readable topology; correctly formatted matrices; M1 predefined + real-time mode interfaces (real-time may be an honest unavailable state); M2 anomaly + recovery views; M3 predefined + custom interfaces (custom honest unavailable state); professional report layout; connectivity indicators; consistent result source labels; **all visible controls perform advertised actions**; loading/empty/error states; polished desktop/laptop; responsive; palette + typography followed; references used as inspiration only.

## 17. Priority order

Navigation/dashboard → design system → M1 workspace → M2 workspace → M3 workspace → topology → math presentation → responsive polish → animation refinement. Initial target: coherent usable MVP, not a production design system.

---

## Hard constraints from the functional spec (must not regress)

- Result provenance labels must remain exact: `Live MATLAB Result`, `Saved MATLAB Result`, `Saved Result · Reference-Verified`, `Live Network Measurement`, `Simulated Network Scenario`, `AI-Proposed Model`, `Template-Based Report`.
- All results still come from `POST /api/execute`. Do not compute math in the browser.
- No fabricated live measurements, no fake AI output, no invented live statistics.
- No nonfunctional buttons anywhere.
- Preserve: 11 passing tests, `npm run build`, scenario fixtures, localStorage report persistence.
- All external fonts/icons must be bundled locally; app must work with internet disconnected.
