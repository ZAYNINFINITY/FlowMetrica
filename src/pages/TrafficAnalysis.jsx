import { useState } from 'react';
import { ArrowLeftRight, Gauge, Layers, RotateCcw } from 'lucide-react';

import ConceptHint from '../components/common/ConceptHint.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import MatrixViewer from '../components/common/MatrixViewer.jsx';
import ModeCard from '../components/common/ModeCard.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ScenarioCard from '../components/common/ScenarioCard.jsx';
import SourceBadge from '../components/common/SourceBadge.jsx';
import StepList from '../components/common/StepList.jsx';
import Tabs from '../components/common/Tabs.jsx';
import LiveMeasurementPanel from '../components/LiveMeasurementPanel.jsx';
import { CardGridSkeleton, WorkspaceSkeleton } from '../components/common/Skeleton.jsx';
import NetworkCanvas from '../components/visualization/NetworkCanvas.jsx';
import { useScenario } from '../hooks/useScenario.js';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_NOTES,
  classificationTone,
  complexityLabel,
  formatVector,
} from '../lib/format.js';

const TABS = [
  { id: 'input', label: 'Input Data' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'steps', label: 'Elimination' },
  { id: 'rref', label: 'RREF' },
  { id: 'solution', label: 'Solution' },
];

function buildMatrices(scenario) {
  const { matrix, vector } = scenario.execution.input;
  return {
    coefficient: matrix,
    augmented: matrix.map((row, index) => [...row, vector[index]]),
  };
}

function NodeInspector({ topology, nodeId, onClear }) {
  const node = topology.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return (
      <div className="flex min-h-[68px] items-center rounded-lg border border-dashed border-line px-3 py-2 text-[11px] text-muted">
        Select a router in the canvas to inspect its links.
      </div>
    );
  }

  const links = topology.edges.filter((edge) => edge.from === node.id || edge.to === node.id);

  return (
    <div className="min-h-[68px] rounded-lg border border-accent/25 bg-accent/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-[12px] font-semibold text-ink">{node.label}</p>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Clear selection
        </button>
      </div>
      <ul className="mt-2 flex flex-wrap gap-2">
        {links.map((edge) => {
          const outgoing = edge.from === node.id;
          return (
            <li
              key={edge.id}
              className="inline-flex items-center gap-1.5 rounded border border-line bg-sunken/80 px-2 py-1 text-[10.5px]"
            >
              <ArrowLeftRight aria-hidden="true" className="h-3 w-3 text-muted" />
              <span className="font-mono text-accent">{edge.label}</span>
              <span className="text-muted">
                {outgoing ? `out to ${edge.to}` : `in from ${edge.from}`}
              </span>
              <span className="font-mono text-[9.5px] uppercase text-muted/80">{edge.status}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function TrafficAnalysis({ details, health, online }) {
  const { scenarios, selectedId, setSelectedId, scenario, outcome, loading, error, reload } =
    useScenario('module1');
  const [mode, setMode] = useState('predefined');
  const [activeTab, setActiveTab] = useState('input');
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const result = outcome?.status === 'success' ? outcome.result : null;
  const matrices = scenario ? buildMatrices(scenario) : null;
  const measurementService = health?.services?.networkMeasurement;
  const measurementAvailable = measurementService?.available === true;

  const openScenario = (id) => {
    setSelectedNodeId(null);
    setActiveTab('input');
    if (id === selectedId) reload();
    else setSelectedId(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 01"
        title="Network Traffic Analysis"
        description="Visualize network structures and explore mathematical traffic distribution."
        meta={
          <>
            <span className="chip">Offline-first</span>
            <span className="chip">Matrices &amp; RREF</span>
            <span className="chip">Directed topology</span>
          </>
        }
        actions={
          mode === 'predefined' ? (
            <button type="button" onClick={reload} className="btn-secondary btn-xs" disabled={loading}>
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Re-run analysis
            </button>
          ) : undefined
        }
      />

      <section aria-label="Analysis modes" className="grid gap-3 md:grid-cols-2">
        <ModeCard
          icon={Layers}
          title="Predefined analysis"
          description="Pick a saved network scenario, inspect its topology, and follow the linear system from matrix to solution."
          status={mode === 'predefined' ? 'Active mode' : 'Available'}
          active={mode === 'predefined'}
          onClick={() => setMode('predefined')}
          meta="Fully offline · reference-verified saved results"
        />
        <ModeCard
          icon={Gauge}
          title="Live measurement"
          description="Run a real Ookla speed test, then see the measured rates solved as a fixed 2×2 teaching model."
          status={
            !measurementService
              ? 'Checking'
              : measurementAvailable
                ? mode === 'live'
                  ? 'Active mode'
                  : 'Available'
                : 'Unavailable'
          }
          statusTone={measurementService && !measurementAvailable ? 'unavailable' : 'active'}
          active={mode === 'live'}
          onClick={() => setMode('live')}
          meta={
            measurementAvailable
              ? 'Real Ookla test · requires internet'
              : 'The server reason is shown in the panel'
          }
        />
      </section>

      {measurementService?.available && (
        <p className="text-[11px] leading-relaxed text-muted">
          The speed test measures this connection only. The 2×2 model below is a fixed teaching
          example, not a diagnosis of your network.
        </p>
      )}

      {mode === 'live' ? (
        <LiveMeasurementPanel
          service={measurementService}
          healthLoaded={Boolean(health)}
          online={online}
          onBack={() => setMode('predefined')}
        />
      ) : (
        <>
          <section aria-labelledby="scenarios-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="scenarios-heading" className="section-title">
                Scenario library
              </h2>
              <span className="chip">{scenarios.length} scenarios · offline</span>
            </div>

            {loading && scenarios.length === 0 && <CardGridSkeleton count={2} />}
            {error && scenarios.length === 0 && (
              <ErrorState title="Scenarios could not load" message={error} onRetry={reload} />
            )}
            {scenarios.length === 0 && !loading && !error && (
              <EmptyState
                icon={Layers}
                title="No scenarios available"
                description="The local scenario store returned no traffic scenarios."
              />
            )}
            {scenarios.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {scenarios.map((summary) => (
                  <ScenarioCard
                    key={summary.id}
                    scenario={summary}
                    topology={details[summary.id]?.topology}
                    active={summary.id === selectedId}
                    onOpen={openScenario}
                  />
                ))}
              </div>
            )}
          </section>

          {loading && <WorkspaceSkeleton label="Loading scenario and result" />}

          {!loading && error && (
            <ErrorState
              title="Analysis failed"
              message={error}
              onRetry={reload}
              retryLabel="Retry analysis"
            />
          )}

          {!loading && !error && scenario && result && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-workspace">
              <section aria-labelledby="topology-heading" className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 id="topology-heading" className="section-title">
                      Network topology
                    </h2>
                    <p className="mt-0.5 truncate text-[12px] text-muted">{scenario.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="chip">{scenario.topology.nodes.length} nodes</span>
                    <span className="chip">{scenario.topology.edges.length} links</span>
                  </div>
                </div>

                <div className="mt-4">
                  <NetworkCanvas
                    topology={scenario.topology}
                    label={`${scenario.title} topology`}
                    height={360}
                    selectedId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                    caption="Directed links carry the unknown traffic flows. This is a teaching model, not a measured network."
                  />
                </div>

                <div className="mt-3">
                  <NodeInspector
                    topology={scenario.topology}
                    nodeId={selectedNodeId}
                    onClear={() => setSelectedNodeId(null)}
                  />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-[11px] sm:grid-cols-3">
                  <div>
                    <dt className="text-muted">Complexity</dt>
                    <dd className="mt-0.5 font-medium text-ink">{complexityLabel(scenario.complexity)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Operation</dt>
                    <dd className="mt-0.5 truncate font-mono text-[11px] text-ink">
                      {scenario.execution.operation}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Unknowns</dt>
                    <dd className="mt-0.5 font-medium text-ink">{scenario.variables.length}</dd>
                  </div>
                </dl>
              </section>

              <section aria-labelledby="analysis-heading" className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 id="analysis-heading" className="section-title">
                      Mathematical analysis
                    </h2>
                    <p className="mt-0.5 text-[12px] text-muted">A·x = b solved by Gaussian elimination.</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <SourceBadge source={outcome.result_source} note={outcome.matlab_export_note} />
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classificationTone(
                        result.classification,
                      )}`}
                    >
                      {CLASSIFICATION_LABELS[result.classification]}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="rounded-lg border border-analysis/25 bg-analysis/5 p-3 text-[11.5px] leading-relaxed text-muted">
                    <span className="font-medium text-ink">How to read this:</span> start with the
                    variables and equations. The tabs then turn those same rules into a matrix,
                    elimination steps, RREF and the final answer.
                  </p>

                  <dl className="grid gap-2 rounded-lg border border-line bg-sunken/50 p-3 text-[11px] sm:grid-cols-3">
                    <div>
                      <dt className="meta-label">Variables</dt>
                      <dd className="mt-1 leading-relaxed text-muted">
                        x holds the unknown Mbps on each link in the{' '}
                        <ConceptHint term="topology">
                          The node-and-link drawing of this teaching network.
                        </ConceptHint>
                        .
                      </dd>
                    </div>
                    <div>
                      <dt className="meta-label">Model</dt>
                      <dd className="mt-1 leading-relaxed text-muted">
                        <ConceptHint term="A·x = b">
                          One compact line for all the equations at once.
                        </ConceptHint>{' '}
                        — each row is a rule the flows must satisfy.
                      </dd>
                    </div>
                    <div>
                      <dt className="meta-label">Output</dt>
                      <dd className="mt-1 leading-relaxed text-muted">
                        The solution shows the split, or why no single split exists.
                      </dd>
                    </div>
                  </dl>

                  <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} idPrefix="m1" label="Traffic analysis results" />
                </div>

                <div
                  role="tabpanel"
                  id="m1-panel"
                  aria-labelledby={`m1-tab-${activeTab}`}
                  className="mt-4 min-h-[280px]"
                >
                  {activeTab === 'input' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="meta-label">Variables</h3>
                        <ul className="mt-2 divide-y divide-line/60">
                          {scenario.variables.map((variable) => (
                            <li key={variable.symbol} className="flex gap-3 py-1.5 text-[12.5px]">
                              <span className="w-8 shrink-0 font-mono text-accent">{variable.symbol}</span>
                              <span className="text-muted">{variable.meaning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="meta-label">Equations</h3>
                        <ul className="mt-2 space-y-1.5 rounded-lg border border-line bg-sunken/70 p-3 font-mono text-[12.5px] text-ink">
                          {scenario.equations.map((equation) => (
                            <li key={equation}>{equation}</li>
                          ))}
                        </ul>
                      </div>
                      {scenario.concept && (
                        <p className="rounded-lg border border-analysis/25 bg-analysis/5 p-3 text-[12px] leading-relaxed text-muted">
                          {scenario.concept}
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === 'matrix' && (
                    <div className="space-y-5">
                      <p className="prose-note">
                        Each row is one{' '}
                        <ConceptHint term="constraint">
                          A rule, such as what enters a junction must leave it.
                        </ConceptHint>
                        . The{' '}
                        <ConceptHint term="augmented matrix">
                          The coefficient matrix with the constants added as one extra column.
                        </ConceptHint>{' '}
                        keeps those constants beside the equations.
                      </p>
                      <MatrixViewer matrix={matrices.coefficient} caption="Coefficient matrix A" />
                      <MatrixViewer
                        matrix={matrices.augmented}
                        augmented
                        caption="Augmented matrix [A | b]"
                        columnLabels={[...scenario.variables.map((variable) => variable.symbol), 'b']}
                      />
                    </div>
                  )}

                  {activeTab === 'steps' && <StepList steps={result.steps} />}

                  {activeTab === 'rref' && (
                    <div className="space-y-4">
                      <MatrixViewer
                        matrix={result.rref}
                        augmented
                        highlightSolutionColumn
                        caption="Reduced Row Echelon Form"
                        columnLabels={[...scenario.variables.map((variable) => variable.symbol), 'b']}
                      />
                      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-sunken/60 p-3 text-[12px]">
                        <div>
                          <dt className="text-muted">Rank</dt>
                          <dd className="mt-0.5 font-mono text-ink">
                            {result.rank} of {result.variableCount}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Pivot columns</dt>
                          <dd className="mt-0.5 font-mono text-ink">
                            {result.pivotColumns?.length
                              ? result.pivotColumns.map((column) => column + 1).join(', ')
                              : 'none'}
                          </dd>
                        </div>
                      </dl>
                      <p className="prose-note">{CLASSIFICATION_NOTES[result.classification]}</p>
                    </div>
                  )}

                  {activeTab === 'solution' && (
                    <div className="space-y-4">
                      {result.classification === 'unique' && Array.isArray(result.solution) ? (
                        <>
                          <div className="rounded-lg border border-accent/35 bg-accent/10 p-4">
                            <p className="meta-label text-accent">Final solution vector</p>
                            <p className="mt-1.5 font-mono text-[20px] font-medium tracking-tight text-ink">
                              {formatVector(result.solution)}
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {scenario.variables.map((variable, index) => (
                              <div
                                key={variable.symbol}
                                className="rounded-lg border border-line bg-sunken/60 p-3"
                              >
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="font-mono text-[13px] text-accent">{variable.symbol}</span>
                                  <span className="font-mono text-[18px] text-ink">
                                    {result.solution[index]}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] leading-snug text-muted">{variable.meaning}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : result.classification === 'infinite_solutions' ? (
                        <div className="rounded-lg border border-warn/30 bg-warn/5 p-4">
                          <p className="font-display text-[13px] font-semibold text-warn">No single solution vector</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-muted">
                            The system is underdetermined, so the solution is a family described by free
                            variables.
                          </p>
                          {result.parametricForm?.length > 0 && (
                            <ul className="mt-3 space-y-1 rounded border border-line bg-base/50 p-2.5 font-mono text-[12px] text-ink">
                              {result.parametricForm.map((line) => (
                                <li key={line}>{line}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
                          <p className="font-display text-[13px] font-semibold text-danger">No valid traffic assignment</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-muted">
                            {CLASSIFICATION_NOTES[result.classification]}
                          </p>
                        </div>
                      )}

                      <div className="rounded-lg border border-line bg-sunken/50 p-3">
                        <p className="text-[11px] text-muted">
                          Provenance: the result above is returned by the shared execution interface. No
                          arithmetic is performed in this browser.
                        </p>
                        <div className="mt-2">
                          <SourceBadge source={outcome.result_source} note={outcome.matlab_export_note} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {scenario.teachingNotes?.length > 0 && (
                  <div className="mt-4 border-t border-line pt-3">
                    <h3 className="meta-label">Teaching notes</h3>
                    <ul className="mt-1.5 space-y-1">
                      {scenario.teachingNotes.map((note) => (
                        <li key={note} className="flex gap-2 text-[11.5px] leading-relaxed text-muted">
                          <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted/60" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
