import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  CircleAlert,
  Clock,
  Gauge,
  Globe2,
  RefreshCw,
  Server,
  Timer,
  Waves,
} from 'lucide-react';

import EmptyState from './common/EmptyState.jsx';
import MatrixViewer from './common/MatrixViewer.jsx';
import SourceBadge from './common/SourceBadge.jsx';
import StepList from './common/StepList.jsx';
import { execute, measureNetwork } from '../lib/api.js';
import {
  CLASSIFICATION_LABELS,
  CLASSIFICATION_NOTES,
  classificationTone,
  formatDateTime,
  formatVector,
} from '../lib/format.js';

/**
 * Row 1 is the measured download total, row 2 the measured upload difference.
 * It is a fixed teaching model chosen by the UI; the values come from Ookla and
 * the solution comes from POST /api/execute.
 */
const LIVE_MATRIX = [
  [1, 1],
  [1, -1],
];
const LIVE_COLUMNS = ['x₁', 'x₂', 'b'];
const LIVE_SCENARIO_ID = 'network_traffic_live';
const LIVE_OPERATION = 'solve_live_measurement';

const IDLE_RUN = { phase: 'idle', measurement: null, error: null, code: null };
const IDLE_ANALYSIS = { phase: 'idle', result: null, source: null, appliedVector: null, error: null, code: null };

function formatMetric(value, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: digits })
    : '—';
}

function Metric({ icon: Icon, label, value, unit, tone = 'text-ink' }) {
  return (
    <div className="rounded-lg border border-line bg-base/40 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className={`mt-1 font-mono text-[17px] leading-none tracking-tight ${tone}`}>
        {value}
        {unit && <span className="ml-1 text-[10px] font-normal text-muted">{unit}</span>}
      </p>
    </div>
  );
}

function AvailabilityCheck() {
  return (
    <div role="status" className="space-y-2">
      <span className="sr-only">Checking live measurement availability</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="h-12 animate-pulse rounded-lg bg-raised/70" />
      ))}
    </div>
  );
}

/**
 * Live measurement workspace. It owns the measurement/analysis state machine so
 * the page stays a layout: measure → execute → render the shared result views.
 */
export default function LiveMeasurementPanel({ service, healthLoaded, online, onBack }) {
  const [run, setRun] = useState(IDLE_RUN);
  const [analysis, setAnalysis] = useState(IDLE_ANALYSIS);
  const [elapsed, setElapsed] = useState(0);
  const busyRef = useRef(false);

  useEffect(() => {
    if (run.phase !== 'running') return undefined;
    const startedAt = Date.now();
    setElapsed(0);
    const timer = window.setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [run.phase]);

  const analyse = useCallback(async (measurement) => {
    setAnalysis({ ...IDLE_ANALYSIS, phase: 'loading' });
    try {
      const payload = await execute({
        module: 'module1',
        scenario_id: LIVE_SCENARIO_ID,
        operation: LIVE_OPERATION,
        input: { measurementId: measurement.id, matrix: LIVE_MATRIX },
      });
      setAnalysis({
        phase: 'success',
        result: payload.result,
        source: payload.result_source,
        appliedVector: payload.applied_vector,
        error: null,
        code: null,
      });
    } catch (cause) {
      setAnalysis({
        phase: 'error',
        result: null,
        source: null,
        appliedVector: null,
        error: cause.message,
        code: cause.code ?? null,
      });
    }
  }, []);

  const runTest = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRun({ ...IDLE_RUN, phase: 'running' });
    setAnalysis(IDLE_ANALYSIS);

    try {
      const payload = await measureNetwork();
      setRun({ phase: 'success', measurement: payload.measurement, error: null, code: null });
      await analyse(payload.measurement);
    } catch (cause) {
      // The server message is surfaced verbatim; no numbers are invented.
      setRun({
        phase: 'error',
        measurement: null,
        error: cause.message,
        code: cause.code ?? null,
      });
    } finally {
      busyRef.current = false;
    }
  }, [analyse]);

  const measurement = run.measurement;
  const result = analysis.result;
  const busy = run.phase === 'running';

  if (!healthLoaded) {
    return (
      <section aria-labelledby="live-heading" className="surface p-4 sm:p-5">
        <h2 id="live-heading" className="section-title">
          Live measurement
        </h2>
        <div className="mt-3">
          <AvailabilityCheck />
        </div>
      </section>
    );
  }

  if (!service?.available) {
    return (
      <section aria-labelledby="live-heading" className="surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="live-heading" className="section-title">
              Live measurement
            </h2>
            <p className="mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-muted">
              An Ookla speed test measures this device&rsquo;s connection. It is not part of the
              mathematical teaching scenarios, so it stays separate from them.
            </p>
          </div>
          <span className="chip border-warn/30 bg-warn/10 text-warn">Unavailable on this server</span>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-warn/35 bg-warn/[0.04] p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-warn" />
            No speed test can run right now
          </p>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted">
            No measurement is taken and no numbers are simulated. Predefined scenarios, matrices,
            elimination steps and RREF keep working offline.
          </p>
          <p className="mt-3 max-w-2xl rounded-md border border-line bg-sunken/70 p-3 text-[12px] leading-relaxed text-muted">
            <span className="font-semibold text-ink">Why: </span>
            {service?.reason ?? 'The measurement runner did not load on this server.'}
          </p>
          <button type="button" onClick={onBack} className="btn-secondary btn-xs mt-4">
            Back to predefined analysis
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="live-heading" className="surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="live-heading" className="section-title">
            Live measurement
          </h2>
          <p className="mt-1 max-w-[64ch] text-[12.5px] leading-relaxed text-muted">
            A real Ookla test of this device&rsquo;s connection. The measured rates are handed to the
            shared execution interface; the browser never solves anything.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip">Ookla speed test</span>
          <span className="chip">One test at a time</span>
          {run.phase === 'success' && <SourceBadge source="live_network_measurement" />}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-3">
          {run.phase === 'idle' && (
            <div className="rounded-lg border border-line bg-sunken/60 p-4">
              <p className="text-[12.5px] leading-relaxed text-muted">
                Download, upload, ping, jitter and packet loss are measured against a nearby Ookla
                server. The test usually takes 20&ndash;60 seconds and uses your internet connection.
              </p>
              <button
                type="button"
                onClick={runTest}
                disabled={online === false}
                className="btn-primary mt-3"
              >
                <Gauge aria-hidden="true" className="h-4 w-4" />
                Run speed test
              </button>
              {online === false ? (
                <p className="mt-2 text-[11px] text-warn">
                  No internet connection is reported. Connect to run a measurement.
                </p>
              ) : (
                <p className="mt-2 font-mono text-[10.5px] text-muted">
                  20&ndash;60 seconds · requires internet
                </p>
              )}
            </div>
          )}

          {run.phase === 'running' && (
            <div className="rounded-lg border border-accent/30 bg-accent/[0.05] p-4">
              <p role="status" className="flex items-center gap-2 text-[12.5px] font-medium text-ink">
                <RefreshCw aria-hidden="true" className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
                Measuring your connection…
              </p>
              <div
                aria-hidden="true"
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-raised"
              >
                <div className="h-full w-1/4 rounded-full bg-accent animate-scan motion-reduce:w-full motion-reduce:animate-none" />
              </div>
              <p aria-hidden="true" className="mt-2 font-mono text-[10.5px] text-muted">
                Elapsed {elapsed}s · a test can take 20&ndash;60 seconds
              </p>
              <button type="button" disabled className="btn-secondary mt-3">
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Test running
              </button>
            </div>
          )}

          {run.phase === 'error' && (
            <div role="alert" className="rounded-lg border border-danger/35 bg-danger/[0.05] p-4">
              <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-danger" />
                Speed test failed
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{run.error}</p>
              {run.code && (
                <p className="mt-1 font-mono text-[10px] text-muted/80">{run.code}</p>
              )}
              <button type="button" onClick={runTest} disabled={busy} className="btn-secondary btn-xs mt-3">
                <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                Try again
              </button>
            </div>
          )}

          {run.phase === 'success' && measurement && (
            <div className="rounded-lg border border-line bg-sunken/60 p-4">
              <div className="grid grid-cols-2 gap-2.5">
                <Metric
                  icon={ArrowDownToLine}
                  label="Download"
                  value={formatMetric(measurement.downloadMbps)}
                  unit="Mbps"
                  tone="text-accent"
                />
                <Metric
                  icon={ArrowUpFromLine}
                  label="Upload"
                  value={formatMetric(measurement.uploadMbps)}
                  unit="Mbps"
                  tone="text-analysis"
                />
                <Metric icon={Timer} label="Ping" value={formatMetric(measurement.pingMs, 1)} unit="ms" />
                <Metric icon={Waves} label="Jitter" value={formatMetric(measurement.jitterMs, 1)} unit="ms" />
                <Metric icon={Activity} label="Packet loss" value={formatMetric(measurement.packetLoss)} unit="%" />
                <Metric icon={Clock} label="Measured" value={formatDateTime(measurement.measuredAt)} />
              </div>

              <div className="mt-3 space-y-1 border-t border-line pt-3 text-[11px] text-muted">
                <p className="flex items-center gap-1.5">
                  <Server aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {measurement.server?.name ?? 'Server not reported'}
                    {measurement.server?.country ? `, ${measurement.server.country}` : ''}
                    {measurement.server?.sponsor ? ` · ${measurement.server.sponsor}` : ''}
                  </span>
                </p>
                {measurement.isp && (
                  <p className="flex items-center gap-1.5">
                    <Globe2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{measurement.isp}</span>
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={runTest}
                  disabled={busy}
                  className="btn-secondary btn-xs"
                >
                  <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                  Run again
                </button>
                <span className="font-mono text-[10px] text-muted">id {measurement.id?.slice(0, 8)}…</span>
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
              Mathematical analysis
            </h3>
            <span className="chip">Fixed 2×2 teaching model</span>
          </div>

          <p className="mt-2 rounded-lg border border-analysis/25 bg-analysis/[0.05] p-3 text-[11.5px] leading-relaxed text-muted">
            Row 1 is the measured download total (x₁ + x₂ = download). Row 2 is the measured upload
            difference (x₁ &minus; x₂ = upload). This is a teaching model chosen for the demo, not a
            physical law and not a measurement of link capacities.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
            <MatrixViewer matrix={LIVE_MATRIX} caption="Coefficient matrix A" columnLabels={['x₁', 'x₂']} />
            <p className="text-[11px] leading-relaxed text-muted">
              The server builds the right-hand side from the measurement itself, never from the
              browser. Until a test finishes there is nothing to solve, so no result is shown.
            </p>
          </div>

          <div className="mt-3">
            {analysis.phase === 'idle' && (
              <EmptyState
                icon={Activity}
                title="No live result yet"
                description="Run a speed test to see the measured rates solved as a 2×2 system."
                compact
              />
            )}

            {analysis.phase === 'loading' && (
              <div role="status" className="rounded-lg border border-line bg-sunken/60 p-4">
                <p className="text-[12px] font-medium text-ink">Solving the teaching model…</p>
                <div className="mt-3 space-y-2" aria-hidden="true">
                  <span className="block h-2 w-3/4 animate-pulse rounded bg-raised" />
                  <span className="block h-2 w-2/3 animate-pulse rounded bg-raised" />
                  <span className="block h-2 w-1/2 animate-pulse rounded bg-raised" />
                </div>
              </div>
            )}

            {analysis.phase === 'error' && (
              <div role="alert" className="rounded-lg border border-danger/35 bg-danger/[0.05] p-4">
                <p className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                  <CircleAlert aria-hidden="true" className="h-4 w-4 shrink-0 text-danger" />
                  {analysis.code === 'MEASUREMENT_NOT_FOUND'
                    ? 'This measurement is no longer available'
                    : 'The analysis could not run'}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted">{analysis.error}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {measurement && (
                    <button
                      type="button"
                      onClick={() => analyse(measurement)}
                      className="btn-secondary btn-xs"
                    >
                      <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                      Retry analysis
                    </button>
                  )}
                  <button type="button" onClick={runTest} disabled={busy} className="btn-secondary btn-xs">
                    <Gauge aria-hidden="true" className="h-3.5 w-3.5" />
                    Run a new speed test
                  </button>
                </div>
              </div>
            )}

            {analysis.phase === 'success' && result && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SourceBadge source={analysis.source ?? 'live_network_measurement'} />
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classificationTone(
                      result.classification,
                    )}`}
                  >
                    {CLASSIFICATION_LABELS[result.classification]}
                  </span>
                </div>

                <div className="rounded-lg border border-accent/35 bg-accent/[0.06] p-4">
                  <p className="meta-label text-accent">Solution vector</p>
                  <p className="mt-1.5 font-mono text-[19px] font-medium tracking-tight text-ink">
                    x = {formatVector(result.solution)}
                  </p>
                  {Array.isArray(analysis.appliedVector) && (
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">
                      The execution interface applied{' '}
                      <span className="font-mono text-ink">
                        [{analysis.appliedVector.join(', ')}]
                      </span>{' '}
                      as the right-hand side (download, upload).
                    </p>
                  )}
                </div>

                {result.classification !== 'unique' && (
                  <p className="rounded-lg border border-warn/30 bg-warn/[0.05] p-3 text-[11.5px] leading-relaxed text-muted">
                    {CLASSIFICATION_NOTES[result.classification]}
                    {result.parametricForm?.length > 0 && (
                      <span className="mt-2 block font-mono text-[11px] text-ink">
                        {result.parametricForm.join(' · ')}
                      </span>
                    )}
                  </p>
                )}

                <MatrixViewer
                  matrix={result.rref}
                  augmented
                  highlightSolutionColumn
                  dense
                  caption="Reduced Row Echelon Form"
                  columnLabels={LIVE_COLUMNS}
                />

                <p className="font-mono text-[10.5px] text-muted">
                  rank {result.rank} of {result.variableCount} · pivot columns{' '}
                  {result.pivotColumns?.length
                    ? result.pivotColumns.map((column) => column + 1).join(', ')
                    : 'none'}
                </p>

                <div className="rounded-lg border border-line bg-sunken/60 p-3">
                  <p className="meta-label">Elimination steps</p>
                  <div className="mt-2">
                    <StepList steps={result.steps} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
