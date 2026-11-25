# ChatGPT scenario prompt

Use this when asking ChatGPT to author a new FlowMetrica incident. ChatGPT writes
only the scenario definition; **MATLAB must produce the result fixture**.

```text
Create ONE FlowMetrica incident scenario as raw JSON only, no markdown.

Copy this exact top-level shape:
{
  "id": "incident_<short_name>_01",
  "module": "module3",
  "title": "INC-### · Short Title",
  "summary": "One-sentence summary.",
  "severity": "low | medium | high",
  "complexity": "introductory | intermediate | advanced",
  "tags": ["short tag", "another tag"],
  "description": "Teaching narrative with measured Mbps readings.",
  "incidentId": "INC-###",
  "detectedAt": "2026-11-25T00:00:00Z",
  "investigationSteps": ["Step 1.", "Step 2.", "Step 3.", "Step 4."],
  "variables": [{ "symbol": "x₁", "meaning": "Meaning (Mbps)" }],
  "equations": ["x₁ + x₂ = 100"],
  "topology": {
    "nodes": [{ "id": "GW", "label": "GW · Gateway", "x": 70, "y": 150 }],
    "edges": [{ "id": "e1", "from": "GW", "to": "A", "label": "x₁", "status": "normal" }]
  },
  "execution": {
    "operation": "investigate_incident",
    "input": {
      "matrix": [[1, 1], [1, -1]],
      "vector": [100, 20]
    }
  },
  "verification": {
    "expectedClassification": "unique",
    "expectedSolution": [60, 40]
  },
  "templateFindings": ["Finding text."],
  "suggestedActions": ["Action text."]
}

Rules:
- id must be lowercase snake_case and unique.
- matrix rows must equal vector length; use independent equations.
- status must be normal, failed or restored; every edge endpoint must exist in nodes.
- Do NOT write a fixture, output object or result numbers outside verification.
- verification is only a hand-check hint; MATLAB output is the authority.
- Return only the JSON object.
```

Save the result as `matlab/incoming/<id>.json`, then run:

```matlab
addpath(genpath(pwd))
export_scenario('<id>')
```
