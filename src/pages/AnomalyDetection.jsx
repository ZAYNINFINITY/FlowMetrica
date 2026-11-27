import { useState } from 'react';
import { ArrowRight, FlaskConical, RotateCcw, ShieldAlert, TriangleAlert } from 'lucide-react';

import ConceptHint from '../components/common/ConceptHint.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import MatrixViewer from '../components/common/MatrixViewer.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ScenarioCard from '../components/common/ScenarioCard.jsx';
import SourceBadge from '../components/common/SourceBadge.jsx';
import { CardGridSkeleton, WorkspaceSkeleton } from '../components/common/Skeleton.jsx';
import NetworkCanvas from '../components/visualization/NetworkCanvas.jsx';
import { useScenario } from '../hooks/useScenario.js';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_NOTES,
  classificationTone,
  formatVector,
} from '../lib/format.js';

const STAGES = [
  {
    id: 'normal',
    order: 'Stage 1',
    title: 'Normal state',
    tone: 'text-accent',
    frame: 'border-line',
  },
  {
    id: 'failed',
    order: 'Stage 2',
    title: 'Anomaly state',
    tone: 'text-danger',
    frame: 'border-danger/35',
  },
  {
    id: 'corrected',
    order: 'Stage 3',
    title: 'Corrected state',
    tone: 'text-ok',
    frame: 'border-ok/30',
  },
];

export default function AnomalyDetection({ details }) {
  const { scenarios, selectedId, setSelectedId, scenario, outcome, loading, error, reload } =
    useScenario('module2');
  const [noteOpen, setNoteOpen] = useState(true);
  const result = outcome?.status === 'success' ? outcome.result : null;
  const stages = result?.stages ?? [];
  const stageById = Object.fromEntries(stages.map((stage) => [stage.id, stage]));

  const failedEdge = scenario?.failed?.topology?.edges?.find(
    (edge) => edge.id === scenario.failed.failedEdge,
  );
  const backupEdges = scenario?.corrected?.topology?.edges?.filter(
    (edge) => edge.status === 'restored',
  ) ?? [];

  const openScenario = (id) => {
    if (id === selectedId) reload();
    else setSelectedId(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 02"
        title="Network Anomaly Detection"
        description="Identify network inconsistencies and explore mathematical recovery."
        meta={
          <>
            <span className="chip">Inconsistent systems</span>
            <span className="chip">Alternative routing</span>
            <span className="chip">Simulated recovery</span>
          </>
        }
        actions={
          <button type="button" onClick={reload} className="btn-secondary btn-xs" disabled={loading}>
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            Re-run analysis
          </button>
        }
      />

      {noteOpen ? (
        <div
          role="note"
          className="flex flex-wrap items-start gap-3 rounded-xl border border-warn/30 bg-warn/5 p-4"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-warn/30 bg-warn/10 text-warn">
            <FlaskConical aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[13px] font-semibold text-ink">Recovery is a simulation, not a physical repair</p>
            <p className="mt-0.5 max-w-3xl text-[12px] leading-relaxed text-muted">
              The corrected stage changes the mathematical model by adding a backup path. No router,
              cable or link is touched, and no live measurement is taken.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNoteOpen(false)}
            className="text-[11px] font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-warn underline-offset-2 hover:underline"
        >
          <FlaskConical aria-hidden="true" className="h-3.5 w-3.5" />
          Show simulation disclaimer
        </button>
      )}

      <section aria-labelledby="cases-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="cases-heading" className="section-title">
            Anomaly cases
          </h2>
          <span className="chip">
            {scenarios.length} {scenarios.length === 1 ? 'case' : 'cases'} · offline
          </span>
        </div>

        {loading && scenarios.length === 0 && <CardGridSkeleton count={1} />}
        {error && scenarios.length === 0 && (
          <ErrorState title="Anomaly cases could not load" message={error} onRetry={reload} />
        )}
        {!loading && scenarios.length === 0 && !error && (
          <EmptyState icon={ShieldAlert} title="No anomaly cases available" description="The local scenario store returned no anomaly scenarios." />
        )}

        {scenarios.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {scenarios.map((summary) => (
              <ScenarioCard
                key={summary.id}
                scenario={summary}
                topology={details[summary.id]?.normal?.topology ?? details[summary.id]?.topology}
                active={summary.id === selectedId}
                onOpen={openScenario}
              />
            ))}
            <aside className="rounded-xl border border-line bg-sunken/50 p-4">
              <h3 className="meta-label">
                Case scope
              </h3>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                This library ships four anomaly cases: link failure, redundant sensor, inconsistent
                flow and capacity breach. Each compares a normal state, a simulated faulty state and
                a corrected mathematical model.
              </p>
              <ul className="mt-3 space-y-1.5 text-[11.5px] text-muted">
                <li className="flex gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger" />
                  Failed link highlighted in red
                </li>
                <li className="flex gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ok" />
                  Backup route highlighted in green
                </li>
                <li className="flex gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn" />
                  Recovery labelled as a simulation
                </li>
              </ul>
            </aside>
          </div>
        )}
      </section>

      {loading && <WorkspaceSkeleton label="Loading anomaly comparison" />}

      {!loading && error && (
        <ErrorState title="Anomaly analysis failed" message={error} onRetry={reload} retryLabel="Retry analysis" />
      )}

      {!loading && !error && scenario && result && (
        <div className="animate-fade-in space-y-4">
          <section className="surface p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="section-title">{scenario.title}</h2>
                <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-muted">{scenario.summary}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <SourceBadge source={outcome.result_source} note={outcome.matlab_export_note} />
                <SourceBadge source="simulated_data" />
              </div>
            </div>
          </section>

          <section className="surface p-4 sm:p-5">
            <p className="meta-label">How to read this module</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Every stage is the same kind of system.{' '}
              <ConceptHint term="Elimination">
                The row-by-row steps that simplify the equations.
              </ConceptHint>{' '}
              produces the{' '}
              <ConceptHint term="RREF">
                The simplest equivalent form of those equations.
              </ConceptHint>
              . A row that reduces to 0 = 1 means the readings are{' '}
              <ConceptHint term="inconsistent">
                No traffic assignment can satisfy every rule at once.
              </ConceptHint>
              .{' '}
              <ConceptHint term="Rank">
                The number of independent equations in that stage.
              </ConceptHint>{' '}
              tells how constrained the model is. The corrected stage only adds a backup path; it
              does not repair a real router.
            </p>
          </section>

          <section aria-labelledby="stages-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="stages-heading" className="section-title">
                Topology comparison
              </h2>
              <span className="chip">Normal → Anomaly → Corrected</span>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {STAGES.map((stage) => {
                const data = scenario[stage.id];
                const stageResult = stageById[stage.id];
                if (!data?.topology) return null;
                return (
                  <article
                    key={stage.id}
                    className={`overflow-hidden rounded-xl border bg-panel ${stage.frame}`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wide text-muted">{stage.order}</p>
                        <h3 className={`font-display text-[13px] font-semibold ${stage.tone}`}>{stage.title}</h3>
                      </div>
                      {stageResult && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${classificationTone(
                            stageResult.classification,
                          )}`}
                        >
                          {CLASSIFICATION_LABELS[stageResult.classification]}
                        </span>
                      )}
                    </div>

                    <div className="bg-rail">
                      <NetworkCanvas
                        topology={data.topology}
                        label={`${stage.title} topology`}
                        height={210}
                        selectable={false}
                        legend={false}
                      />
                    </div>

                    <div className="space-y-2 px-3 py-3">
                      <p className="text-[11.5px] leading-relaxed text-muted">{data.description}</p>
                      <p className="font-mono text-[10px] text-muted/80">
                        {data.topology.nodes.length} nodes · {data.topology.edges.length} links
                      </p>
                      {stage.id === 'failed' && failedEdge && (
                        <p className="inline-flex items-center gap-1.5 rounded border border-danger/30 bg-danger/10 px-1.5 py-1 font-mono text-[10px] text-danger">
                          <TriangleAlert aria-hidden="true" className="h-3 w-3" />
                          {failedEdge.from} → {failedEdge.to} ({failedEdge.id})
                        </p>
                      )}
                      {stage.id === 'corrected' && backupEdges.length > 0 && (
                        <p className="inline-flex items-center gap-1.5 rounded border border-ok/30 bg-ok/10 px-1.5 py-1 font-mono text-[10px] text-ok">
                          <ArrowRight aria-hidden="true" className="h-3 w-3" />
                          backup {backupEdges.map((edge) => edge.id).join(', ')}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="text-[11px] text-muted">
              Each canvas can be panned and zoomed. Node selection is reserved for the traffic workspace,
              so it is not offered here.
            </p>
          </section>

          <section aria-labelledby="math-heading" className="surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="math-heading" className="section-title">
                Mathematical comparison
              </h2>
              <span className="chip">RREF returned by the execution interface</span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {stages.map((stage) => {
                const meta = STAGES.find((item) => item.id === stage.id);
                const inconsistent = stage.classification === 'no_solution';
                return (
                  <article
                    key={stage.id}
                    className={`rounded-lg border p-4 ${
                      inconsistent ? 'border-danger/35 bg-danger/5' : 'border-line bg-sunken/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="card-title">{meta?.title ?? stage.id}</h3>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${classificationTone(
                          stage.classification,
                        )}`}
                      >
                        {CLASSIFICATION_LABELS[stage.classification]}
                      </span>
                    </div>

                    <div className="mt-3">
                      <MatrixViewer
                        matrix={stage.rref}
                        augmented
                        dense
                        highlightRow={inconsistent ? stage.rref.length - 1 : null}
                        highlightSolutionColumn={!inconsistent}
                        caption="RREF of [A | b]"
                      />
                    </div>

                    <p className="mt-2 font-mono text-[11.5px] text-ink">
                      {stage.solution ? `x = ${formatVector(stage.solution)}` : 'No solution vector exists.'}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">
                      {CLASSIFICATION_NOTES[stage.classification]}
                    </p>
                    {inconsistent && (
                      <p className="mt-2 text-[11px] font-medium text-danger">
                        The highlighted row reads 0 = 1, so the constraints cannot all hold.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3 border-t border-line pt-4 md:grid-cols-2">
              <div>
                <h3 className="meta-label">What changed</h3>
                <ul className="mt-2 space-y-1.5 text-[11.5px] text-muted">
                  <li className="flex gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger" />
                    Primary path constrained to zero, making the system inconsistent.
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ok" />
                    Backup edges {backupEdges.map((edge) => edge.id).join(' and ')} added to the model.
                  </li>
                  <li className="flex gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    The corrected system returns to a unique solution.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="meta-label">Teaching notes</h3>
                <ul className="mt-2 space-y-1">
                  {scenario.teachingNotes.map((note) => (
                    <li key={note} className="flex gap-2 text-[11.5px] leading-relaxed text-muted">
                      <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted/60" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
