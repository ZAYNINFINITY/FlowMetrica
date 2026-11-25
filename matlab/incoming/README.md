# Staged scenarios

Put ChatGPT-authored scenario JSON here, named `<scenario_id>.json`.

A staged scenario is **not** served by the app yet. That is deliberate: the catalogue
test expects every served scenario to already have a matching fixture. MATLAB must
compute and sign the result before the scenario is promoted into
`server/data/scenarios/`.

Run this in MATLAB Online from the project root:

```matlab
addpath(genpath(pwd))
export_scenario('<scenario_id>')
```

Success writes:

- `server/data/fixtures/<scenario_id>.<operation>.json` — genuine MATLAB output
- `server/data/scenarios/<scenario_id>.json` — promoted scenario

Then commit both files, push, pull locally and restart the Node server. The app shows
the new incident with **Saved MATLAB Result**, exactly like the other incidents.
