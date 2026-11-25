import { FileText } from 'lucide-react';

import MatrixViewer from './common/MatrixViewer.jsx';
import SourceBadge from './common/SourceBadge.jsx';
import { CLASSIFICATION_LABELS, formatDateTime, formatVector } from '../lib/format.js';

/**
 * Document-style report. The provenance badge is fixed to Template-Based
 * Report because that is what the app actually produces.
 */
export default function ReportDocument({ report, actions }) {
  if (!report) return null;

  const hasSolution = Array.isArray(report.solution);

  return (
    <article className="print-target overflow-hidden rounded-xl border border-line bg-sunken shadow-panel">
      <header className="border-b border-line bg-gradient-to-r from-analysis/[0.09] via-transparent to-transparent p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-analysis">
              <FileText aria-hidden="true" className="h-3.5 w-3.5" />
              FlowMetrica · Incident report
            </p>
            <h2 className="mt-2 text-[21px] font-semibold leading-tight tracking-tight text-ink sm:text-[24px]">
              {report.title}
            </h2>
            <p className="mt-1 font-mono text-[11px] text-muted">
              {report.incidentId} · generated {formatDateTime(report.createdAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SourceBadge source="template_generated" />
            {actions && <div className="no-print flex flex-wrap gap-1.5">{actions}</div>}
          </div>
        </div>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        <section aria-labelledby="report-description">
          <h3 id="report-description" className="mb-2 border-b border-line/70 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            1 · Incident description
          </h3>
          <p className="text-[12.5px] leading-relaxed text-muted">{report.description}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 rounded-lg border border-line bg-panel/60 p-3 text-[11px] sm:grid-cols-4">
            <div>
              <dt className="print-muted text-muted">Incident ID</dt>
              <dd className="mt-0.5 font-mono text-ink">{report.incidentId}</dd>
            </div>
            <div>
              <dt className="print-muted text-muted">Severity</dt>
              <dd className="mt-0.5 capitalize text-ink">{report.severity ?? 'not recorded'}</dd>
            </div>
            <div>
              <dt className="print-muted text-muted">Detected</dt>
              <dd className="mt-0.5 text-ink">
                {report.detectedAt ? formatDateTime(report.detectedAt) : 'not recorded'}
              </dd>
            </div>
            <div>
              <dt className="print-muted text-muted">Generated</dt>
              <dd className="mt-0.5 text-ink">{formatDateTime(report.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="report-summary">
          <h3 id="report-summary" className="mb-2 border-b border-line/70 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            2 · Investigation summary
          </h3>
          <p className="text-[12.5px] leading-relaxed text-muted">
            Classification:{' '}
            <span className="font-medium text-ink">
              {CLASSIFICATION_LABELS[report.classification] ?? report.classification}
            </span>
            . The coefficient matrix had rank {report.rank} across {report.variableCount} unknown
            {report.variableCount === 1 ? '' : 's'}. All values in this report came from the shared
            execution interface.
          </p>
        </section>

        <section aria-labelledby="report-model">
          <h3 id="report-model" className="mb-2 border-b border-line/70 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            3 · Mathematical model
          </h3>
          {report.equations?.length > 0 && (
            <ul className="mb-3 space-y-1 rounded-lg border border-line bg-panel/60 p-3 font-mono text-[12px] text-ink">
              {report.equations.map((equation) => (
                <li key={equation}>{equation}</li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-start gap-5">
            <MatrixViewer matrix={report.matrix} caption="Coefficient matrix A" dense />
            <div className="min-w-[140px]">
              <p className="print-muted text-[11px] text-muted">Solution vector</p>
              <p className="mt-1 font-mono text-[13px] text-ink">
                {hasSolution ? formatVector(report.solution) : 'not uniquely determined'}
              </p>
              {report.variables?.length > 0 && (
                <ul className="mt-2 space-y-0.5 font-mono text-[10.5px] text-muted">
                  {report.variables.map((variable) => (
                    <li key={variable.symbol}>
                      {variable.symbol} · {variable.meaning}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="report-findings">
          <h3 id="report-findings" className="mb-2 border-b border-line/70 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            4 · Findings
          </h3>
          <ul className="space-y-1.5 text-[12.5px] leading-relaxed text-muted">
            {(report.findings ?? []).map((finding) => (
              <li key={finding} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-analysis" />
                {finding}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="report-actions">
          <h3 id="report-actions" className="mb-2 border-b border-line/70 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            5 · Suggested actions
          </h3>
          <ol className="space-y-1.5 text-[12.5px] leading-relaxed text-muted">
            {(report.actions ?? []).map((action, index) => (
              <li key={action} className="flex gap-2">
                <span className="font-mono text-[10px] text-analysis">{String(index + 1).padStart(2, '0')}</span>
                {action}
              </li>
            ))}
          </ol>
        </section>

        <footer className="border-t border-line pt-3 text-[10.5px] leading-relaxed text-muted">
          <p>
            Provenance: this is a <span className="font-medium text-ink">Template-Based Report</span>,
            assembled locally from values returned by the execution interface. No AI service was
            contacted and no live measurement was taken.
          </p>
          <p className="mt-1 font-mono">Report ID {report.id}</p>
        </footer>
      </div>
    </article>
  );
}
