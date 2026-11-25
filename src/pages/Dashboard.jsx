import {
  ArrowRight,
  Database,
  FileText,
  FolderSearch,
  Network,
  ScanSearch,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';

import EmptyState from '../components/common/EmptyState.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import ModuleCard from '../components/common/ModuleCard.jsx';
import SourceBadge from '../components/common/SourceBadge.jsx';
import TopologyThumbnail from '../components/visualization/TopologyThumbnail.jsx';
import { complexityLabel, formatDateTime } from '../lib/format.js';

const MODULE_META = [
  {
    id: 'module1',
    index: '01',
    title: 'Network Traffic Analysis',
    description: 'Analyze network flows, traffic distribution, matrices and network topologies.',
    accent: 'cyan',
    icon: Network,
  },
  {
    id: 'module2',
    index: '02',
    title: 'Network Anomaly Detection',
    description: 'Identify network inconsistencies, simulate link failures and explore recovery solutions.',
    accent: 'danger',
    icon: ShieldAlert,
  },
  {
    id: 'module3',
    index: '03',
    title: 'Incident Investigation',
    description: 'Investigate network incidents through mathematical analysis and structured reports.',
    accent: 'indigo',
    icon: ScanSearch,
  },
];

const MODULE_SHORT = {
  module1: 'Traffic Analysis',
  module2: 'Anomaly Detection',
  module3: 'Investigation',
};

function ServiceRow({ icon: Icon, label, state, tone, detail }) {
  const toneClass = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-muted';
  return (
    <li className="flex items-start gap-2.5 py-2">
      <Icon aria-hidden="true" className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${toneClass}`} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
          <span className="font-medium text-ink">{label}</span>
          <span className={`font-mono text-[10px] uppercase tracking-wide ${toneClass}`}>{state}</span>
        </p>
        {detail && <p className="mt-0.5 text-[11px] leading-snug text-muted">{detail}</p>}
      </div>
    </li>
  );
}

function ReportPreview({ report }) {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-[230px] rounded-lg border border-analysis/25 bg-base/75 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-analysis">
            Incident report
          </span>
          <FileText aria-hidden="true" className="h-3.5 w-3.5 text-analysis" />
        </div>
        {report ? (
          <>
            <p className="mt-2 truncate text-[12px] font-medium text-ink">{report.title}</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              {report.incidentId} · {formatDateTime(report.createdAt)}
            </p>
            <div className="mt-2 space-y-1" aria-hidden="true">
              <span className="block h-1 w-full rounded bg-line" />
              <span className="block h-1 w-4/5 rounded bg-line" />
              <span className="block h-1 w-2/3 rounded bg-line" />
            </div>
          </>
        ) : (
          <p className="mt-2 text-[11px] leading-snug text-muted">
            No template report generated yet. Investigations work offline.
          </p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ scenarios, details, reports, health, loading, error, onRetry, online }) {
  const byModule = (module) => scenarios.filter((scenario) => scenario.module === module);
  const latestReport = reports[0] ?? null;
  const savedCount = health?.services?.savedResults?.count;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-raised/70 via-panel to-sunken">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/[0.07] blur-3xl"
        />
        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.55fr_1fr] lg:gap-8">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/[0.07] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent">
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent" />
              Network Intelligence Lab
            </p>
            <h1 className="mt-3 font-display text-[32px] font-semibold leading-none tracking-tight text-ink sm:text-[38px]">
              FlowMetrica
            </h1>
            <p className="mt-2 text-[15px] font-medium text-ink/90">
              Network Intelligence &amp; Mathematical Analysis
            </p>
            <p className="mt-2 max-w-[58ch] text-[13.5px] leading-relaxed text-muted">
              Explore network traffic, analyze anomalies, and investigate network incidents through
              mathematical modeling.{' '}
              <a href="#/overview" className="link-inline whitespace-nowrap">
                See how it works →
              </a>
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <a href="#/module1" className="btn-primary">
                Open traffic analysis
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
              <a href="#/saved" className="btn-secondary">
                <FolderSearch aria-hidden="true" className="h-4 w-4" />
                Saved investigations
              </a>
            </div>

            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[11px] text-muted">
              <li>
                <span className="text-ink">{scenarios.length}</span> predefined scenarios
              </li>
              <li>
                <span className="text-ink">{reports.length}</span> saved reports
              </li>
              <li>offline-first · no account required</li>
            </ul>
          </div>

          <div className="rounded-xl border border-line bg-base/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
                Service status
              </h2>
              <span className="font-mono text-[10px] text-muted">local</span>
            </div>
            <ul className="mt-1 divide-y divide-line/60">
              <ServiceRow
                icon={online ? Wifi : WifiOff}
                label="Internet"
                state={online ? 'online' : 'offline'}
                tone={online ? 'ok' : 'warn'}
                detail={online ? undefined : 'Predefined scenarios still work offline.'}
              />
              <ServiceRow
                icon={Database}
                label="Saved results"
                state={savedCount === undefined ? 'checking' : `${savedCount} loaded`}
                tone={savedCount ? 'ok' : 'off'}
                detail="Served by the local execution interface."
              />
            </ul>
          </div>
        </div>
      </section>

      {error && (
        <ErrorState
          title="The local service did not answer"
          message={error}
          onRetry={onRetry}
          retryLabel="Retry connection"
        />
      )}

      <section aria-labelledby="modules-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 id="modules-heading" className="section-title">
            Analysis modules
          </h2>
          <p className="hidden text-[11px] text-muted sm:block">Three interfaces, one execution interface</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {MODULE_META.map((module) => {
            const moduleScenarios = byModule(module.id);
            const firstId = moduleScenarios[0]?.id;
            const detail = firstId ? details[firstId] : null;

            let preview;
            let chips;

            if (module.id === 'module2') {
              preview = detail?.failed?.topology ? (
                <TopologyThumbnail
                  topology={detail.failed.topology}
                  label="Topology preview with a simulated failed link"
                />
              ) : null;
              chips = ['Failed link', 'Inconsistent system', 'Simulated recovery'];
            } else if (module.id === 'module3') {
              preview = <ReportPreview report={latestReport} />;
              chips = ['Offline incidents', 'Template reports', 'Saved history'];
            } else {
              preview = detail?.topology ? (
                <TopologyThumbnail topology={detail.topology} label="Traffic topology preview" />
              ) : null;
              chips = ['Traffic paths', 'Matrices & RREF', 'Interactive topology'];
            }

            return (
              <ModuleCard
                key={module.id}
                index={module.index}
                title={module.title}
                description={module.description}
                href={`#/${module.id}`}
                icon={module.icon}
                accent={module.accent}
                chips={chips}
                preview={preview}
                footer={
                  <>
                    {moduleScenarios.length} scenario{moduleScenarios.length === 1 ? '' : 's'}
                    {module.id === 'module3' && ` · ${reports.length} saved`}
                  </>
                }
              />
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-labelledby="scenarios-heading" className="surface p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="scenarios-heading" className="section-title">
              Predefined scenarios
            </h2>
            <span className="chip">{scenarios.length} available offline</span>
          </div>

          {loading && scenarios.length === 0 ? (
            <div className="mt-4 space-y-2" role="status" aria-live="polite">
              <span className="sr-only">Loading predefined scenarios</span>
              {[0, 1, 2].map((row) => (
                <div key={row} className="h-11 animate-pulse rounded-lg bg-raised/70" />
              ))}
            </div>
          ) : scenarios.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={Network}
                title="No scenarios loaded"
                description="The local service did not return any predefined scenarios."
                compact
                action={
                  onRetry && (
                    <button type="button" onClick={onRetry} className="btn-secondary btn-xs">
                      Retry
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line/60">
              {scenarios.map((scenario) => (
                <li key={scenario.id}>
                  <a
                    href={`#/${scenario.module}`}
                    className="group flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1 py-2.5 transition-colors hover:bg-raised/40"
                  >
                    <span className="w-[92px] shrink-0 truncate font-mono text-[10px] uppercase tracking-wide text-muted">
                      {MODULE_SHORT[scenario.module] ?? scenario.module}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink group-hover:text-accent">
                        {scenario.title}
                      </span>
                      <span className="block truncate text-[11px] text-muted">{scenario.summary}</span>
                    </span>
                    <span className="font-mono text-[10px] text-muted">
                      {scenario.nodeCount}n · {scenario.edgeCount}e
                    </span>
                    <span className="chip">{complexityLabel(scenario.complexity)}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="saved-heading" className="surface flex flex-col p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 id="saved-heading" className="section-title">
              Saved work
            </h2>
            <span className="chip">{reports.length}/20</span>
          </div>

          {reports.length === 0 ? (
            <div className="mt-4 flex-1">
              <EmptyState
                icon={FileText}
                title="No reports yet"
                description="Generate a template report from a predefined incident. Reports stay in this browser."
                compact
                action={
                  <a href="#/module3" className="btn-secondary btn-xs">
                    Open investigation
                  </a>
                }
              />
            </div>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {reports.slice(0, 3).map((report) => (
                  <li key={report.id}>
                    <a
                      href="#/saved"
                      className="block rounded-lg border border-line bg-sunken/60 p-3 transition-colors hover:border-accent/40"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-analysis">{report.incidentId}</span>
                        <SourceBadge source="template_generated" />
                      </span>
                      <span className="mt-1 block truncate text-[12.5px] font-medium text-ink">
                        {report.title}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-muted">
                        {formatDateTime(report.createdAt)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
              <a href="#/saved" className="btn-secondary btn-xs mt-3 w-full">
                View all saved investigations
              </a>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
