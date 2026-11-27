import { useEffect, useState } from 'react';
import { CheckCircle2, FileText, Printer, RotateCcw } from 'lucide-react';

import ConceptHint from '../components/common/ConceptHint.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import MatrixViewer from '../components/common/MatrixViewer.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import ScenarioCard from '../components/common/ScenarioCard.jsx';
import SourceBadge from '../components/common/SourceBadge.jsx';
import Tabs from '../components/common/Tabs.jsx';
import { CardGridSkeleton, WorkspaceSkeleton } from '../components/common/Skeleton.jsx';
import { useToast } from '../components/common/Toast.jsx';
import ReportDocument from '../components/ReportDocument.jsx';
import NetworkCanvas from '../components/visualization/NetworkCanvas.jsx';
import { useReports } from '../hooks/useReports.js';
import { useScenario } from '../hooks/useScenario.js';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_NOTES,
  classificationTone,
  formatDateTime,
  formatVector,
  severityTone,
} from '../lib/format.js';

const TABS = [
  { id: 'overview', label: 'Incident Overview' },
  { id: 'model', label: 'Mathematical Model' },
  { id: 'results', label: 'Execution Results' },
  { id: 'report', label: 'Investigation Report' },
];

function buildReport(scenario, outcome) {
  const result = outcome.result;
  return {
    id: `${scenario.id}-${Date.now()}`,
    incidentId: scenario.incidentId,
    title: scenario.title,
    description: scenario.description,
    severity: scenario.severity,
    detectedAt: scenario.detectedAt,
    createdAt: new Date().toISOString(),
    classification: result.classification,
    rank: result.rank,
    variableCount: result.variableCount,
    matrix: scenario.execution.input.matrix,
    equations: scenario.equations,
    variables: scenario.variables,
    solution: result.solution,
    findings: scenario.templateFindings,
    actions: scenario.suggestedActions,
    source: outcome.result_source,
  };
}

export default function Investigation({ details }) {
  const { scenarios, selectedId, setSelectedId, scenario, outcome, loading, error, reload } =
    useScenario('module3');
  const { reports, saveReport } = useReports();
  const notify = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeReportId, setActiveReportId] = useState(null);

  const result = outcome?.status === 'success' ? outcome.result : null;
  const currentReport =
    reports.find((report) => report.id === activeReportId) ??
    reports.find((report) => report.incidentId === scenario?.incidentId) ??
    null;

  useEffect(() => {
    setActiveReportId(null);
    setActiveTab('overview');
  }, [scenario?.id]);

  const openIncident = (id) => {
    if (id === selectedId) reload();
    else setSelectedId(id);
  };

  const generateReport = () => {
    if (!scenario || !outcome || outcome.status !== 'success') return;
    try {
      const report = buildReport(scenario, outcome);
      saveReport(report);
      setActiveReportId(report.id);
      setActiveTab('report');
      notify({
        title: 'Template report saved',
        description: `${report.incidentId} · stored in this browser`,
        tone: 'success',
      });
    } catch (cause) {
      notify({ title: 'Report could not be saved', description: cause.message, tone: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 03"
        title="Incident Investigation"
        description="Investigate network incidents using mathematical analysis and structured reporting."
        meta={
          <>
            <span className="chip">Offline incidents</span>
            <span className="chip">Template reports</span>
            <span className="chip">{reports.length} saved</span>
          </>
        }
        actions={
          <button type="button" onClick={reload} className="btn-secondary btn-xs" disabled={loading}>
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            Re-run investigation
          </button>
        }
      />

      <section aria-labelledby="incidents-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="incidents-heading" className="section-title">
                Incident cases
              </h2>
              <span className="chip">{scenarios.length} incidents · offline</span>
            </div>

            {loading && scenarios.length === 0 && <CardGridSkeleton count={2} />}
            {error && scenarios.length === 0 && (
              <ErrorState title="Incident cases could not load" message={error} onRetry={reload} />
            )}
            {!loading && scenarios.length === 0 && !error && (
              <EmptyState
                icon={FileText}
                title="No incident cases available"
                description="The local scenario store returned no incident scenarios."
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
                    onOpen={openIncident}
                    showSeverity
                  />
                ))}
              </div>
            )}
          </section>

          {loading && <WorkspaceSkeleton label="Loading incident and result" />}

          {!loading && error && (
            <ErrorState title="Investigation failed" message={error} onRetry={reload} retryLabel="Retry investigation" />
          )}

          {!loading && !error && scenario && result && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]">
              <section aria-labelledby="incident-brief" className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-analysis">
                      {scenario.incidentId} · detected {formatDateTime(scenario.detectedAt)}
                    </p>
                    <h2 id="incident-brief" className="mt-1 text-[17px] font-semibold tracking-tight text-ink">
                      {scenario.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`chip ${severityTone(scenario.severity)}`}>
                      {scenario.severity} severity
                    </span>
                    <span className="chip">{scenario.complexity}</span>
                  </div>
                </div>

                <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{scenario.description}</p>

                {scenario.tags?.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {scenario.tags.map((tag) => (
                      <li key={tag} className="chip">{tag}</li>
                    ))}
                  </ul>
                )}

                <div className="mt-4">
                  <NetworkCanvas
                    topology={scenario.topology}
                    label={`${scenario.title} topology`}
                    height={250}
                    selectable={false}
                    caption="Topology associated with this incident. It is a teaching model, not a measurement."
                  />
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <h3 className="meta-label">Investigation steps</h3>
                  <ol className="mt-2 space-y-2">
                    {scenario.investigationSteps.map((step, index) => (
                      <li key={step} className="flex gap-2.5 text-[12px] leading-relaxed text-muted">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-line bg-raised font-mono text-[9.5px] text-muted">
                          {index + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </section>

              <section aria-labelledby="findings-heading" className="surface p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 id="findings-heading" className="section-title">
                      Investigation result
                    </h2>
                    <p className="mt-0.5 text-[12px] text-muted">Evidence, model and report in one place.</p>
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
                  <div className="rounded-lg border border-analysis/25 bg-analysis/5 p-3 text-[11.5px] leading-relaxed text-muted">
                    <p>
                      <span className="font-medium text-ink">What this proves:</span> the system
                      either fixes every link flow, leaves some choices open, or cannot be satisfied
                      at all.
                    </p>
                    <p className="mt-1">
                      The{' '}
                      <ConceptHint term="classification">
                        Unique, infinitely many, or no valid solution.
                      </ConceptHint>{' '}
                      comes from{' '}
                      <ConceptHint term="rank">
                        The number of independent equations in the model.
                      </ConceptHint>{' '}
                      and{' '}
                      <ConceptHint term="free variables">
                        Unknowns not pinned down by the equations.
                      </ConceptHint>
                      . It does not diagnose a real network; findings and actions are fixed template
                      text.
                    </p>
                  </div>

                  <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} idPrefix="m3" label="Investigation result sections" />
                </div>

                <div
                  role="tabpanel"
                  id="m3-panel"
                  aria-labelledby={`m3-tab-${activeTab}`}
                  className="mt-4 min-h-[300px]"
                >
                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <dl className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-line bg-sunken/60 p-3">
                          <dt className="text-[10px] uppercase tracking-wide text-muted">Classification</dt>
                          <dd className="mt-1 text-[12.5px] font-medium text-ink">
                            {CLASSIFICATION_LABELS[result.classification]}
                          </dd>
                        </div>
                        <div className="rounded-lg border border-line bg-sunken/60 p-3">
                          <dt className="text-[10px] uppercase tracking-wide text-muted">Rank</dt>
                          <dd className="mt-1 font-mono text-[12.5px] text-ink">
                            {result.rank} / {result.variableCount}
                          </dd>
                        </div>
                        <div className="rounded-lg border border-line bg-sunken/60 p-3">
                          <dt className="text-[10px] uppercase tracking-wide text-muted">Unknowns</dt>
                          <dd className="mt-1 text-[12.5px] text-ink">{scenario.variables.length} link flows</dd>
                        </div>
                        <div className="rounded-lg border border-line bg-sunken/60 p-3">
                          <dt className="text-[10px] uppercase tracking-wide text-muted">Saved reports</dt>
                          <dd className="mt-1 text-[12.5px] text-ink">
                            {reports.filter((report) => report.incidentId === scenario.incidentId).length} for this incident
                          </dd>
                        </div>
                      </dl>

                      <div>
                        <h3 className="meta-label">Findings</h3>
                        <ul className="mt-2 space-y-1.5">
                          {scenario.templateFindings.map((finding) => (
                            <li key={finding} className="flex gap-2 text-[12px] leading-relaxed text-muted">
                              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
                              {finding}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="meta-label">Suggested actions</h3>
                        <ol className="mt-2 space-y-1.5">
                          {scenario.suggestedActions.map((action, index) => (
                            <li key={action} className="flex gap-2 text-[12px] leading-relaxed text-muted">
                              <span className="font-mono text-[10px] text-analysis">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                              {action}
                            </li>
                          ))}
                        </ol>
                      </div>

                      <p className="rounded-lg border border-line bg-sunken/50 p-3 text-[11px] leading-relaxed text-muted">
                        Findings and actions are fixed template text attached to the predefined incident.
                        They are not generated by a model.
                      </p>
                    </div>
                  )}

                  {activeTab === 'model' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="meta-label">Variables</h3>
                        <ul className="mt-2 divide-y divide-line/60">
                          {scenario.variables.map((variable) => (
                            <li key={variable.symbol} className="flex gap-3 py-1.5 text-[12.5px]">
                              <span className="w-7 shrink-0 font-mono text-analysis">{variable.symbol}</span>
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
                      <MatrixViewer
                        matrix={scenario.execution.input.matrix}
                        caption="Coefficient matrix A"
                        columnLabels={scenario.variables.map((variable) => variable.symbol)}
                      />
                    </div>
                  )}

                  {activeTab === 'results' && (
                    <div className="space-y-4">
                      <MatrixViewer
                        matrix={result.rref}
                        augmented
                        highlightSolutionColumn={result.classification === 'unique'}
                        caption="Reduced Row Echelon Form"
                        columnLabels={[...scenario.variables.map((variable) => variable.symbol), 'b']}
                      />
                      <div
                        className={`rounded-lg border p-4 ${
                          result.classification === 'unique'
                            ? 'border-accent/35 bg-accent/10'
                            : 'border-warn/30 bg-warn/5'
                        }`}
                      >
                        <p className="meta-label">
                          {result.classification === 'unique' ? 'Solution vector' : 'No unique solution vector'}
                        </p>
                        <p className="mt-1.5 font-mono text-[17px] text-ink">
                          {Array.isArray(result.solution) ? formatVector(result.solution) : '—'}
                        </p>
                        {result.classification === 'infinite_solutions' && result.parametricForm?.length > 0 && (
                          <ul className="mt-2 space-y-1 font-mono text-[11.5px] text-muted">
                            {result.parametricForm.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <p className="prose-note">{CLASSIFICATION_NOTES[result.classification]}</p>
                      <p className="text-[11px] text-muted">
                        Rank {result.rank} of {result.variableCount} unknowns · pivot columns{' '}
                        {result.pivotColumns?.map((column) => column + 1).join(', ') || 'none'}
                      </p>
                    </div>
                  )}

                  {activeTab === 'report' && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-[13px] font-semibold text-ink">Investigation report</h3>
                          <p className="mt-0.5 text-[11px] text-muted">
                            Assembled locally from the values shown in this workspace.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {currentReport && (
                            <button type="button" onClick={() => window.print()} className="btn-secondary btn-xs">
                              <Printer aria-hidden="true" className="h-3.5 w-3.5" />
                              Print
                            </button>
                          )}
                          <button type="button" onClick={generateReport} className="btn-primary btn-xs">
                            <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                            Generate report
                          </button>
                        </div>
                      </div>

                      {currentReport ? (
                        <ReportDocument report={currentReport} />
                      ) : (
                        <EmptyState
                          icon={FileText}
                          title="No report generated for this incident"
                          description="Generate a template report to store the incident summary, model, findings and actions in this browser."
                          action={
                            <button type="button" onClick={generateReport} className="btn-primary btn-xs">
                              Generate template report
                            </button>
                          }
                        />
                      )}
                    </div>
                  )}
                </div>

              </section>
            </div>
          )}
    </div>
  );
}
