import { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  Cpu,
  Database,
  Gauge,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { GitHubMark, LinkedInMark } from '../components/common/BrandMarks.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { useReports } from '../hooks/useReports.js';
import { request } from '../lib/api.js';
import { formatDateTime } from '../lib/format.js';
import { DEFAULT_PREFERENCES } from '../lib/settings.js';

// Architectural guarantees, not user preferences: shown as always-on facts so
// nobody can mistake them for toggles they are expected to choose.
const GUARANTEES = [
  { label: 'Offline-first scenarios', detail: 'Every predefined scenario runs without a connection or login.' },
  { label: 'One execution interface', detail: 'All modules call POST /api/execute; the browser never solves a system.' },
  { label: 'Verified provenance labels', detail: 'Saved fixtures and simulated data are labelled exactly as they are.' },
  { label: 'No stored credentials', detail: 'MATLAB tokens stay in server memory and are never written to disk.' },
];

function Switch({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={`flex items-start justify-between gap-4 rounded-lg border border-line bg-sunken/50 p-3.5 ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">{description}</span>
      </span>
      <span className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="h-5 w-9 rounded-full border border-line bg-raised transition-colors peer-checked:border-accent/60 peer-checked:bg-accent/25 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        />
        <span
          aria-hidden="true"
          className="absolute left-0.5 h-4 w-4 rounded-full bg-muted transition-transform peer-checked:translate-x-4 peer-checked:bg-accent"
        />
      </span>
    </label>
  );
}

function ServiceRow({ icon: Icon, label, state, tone, detail }) {
  const toneClass = tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : 'text-muted';
  return (
    <li className="flex items-start gap-3 border-b border-line/60 py-3 last:border-0">
      <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${toneClass}`} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
          <span className="font-medium text-ink">{label}</span>
          <span className={`font-mono text-[10px] uppercase tracking-wide ${toneClass}`}>{state}</span>
        </p>
        {detail && <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{detail}</p>}
      </div>
    </li>
  );
}

export default function Settings({ preferences, onChangePreferences, onReopenGuide, health, online }) {
  const { reports, clearReports } = useReports();
  const notify = useToast();
  const [confirmClear, setConfirmClear] = useState(false);
  const [matlabSetup, setMatlabSetup] = useState(null);
  const [matlabBusy, setMatlabBusy] = useState(false);
  const [matlabForm, setMatlabForm] = useState({ url: '', token: '', certificatePath: '' });

  const services = health?.services;

  // Bridge state lives on the server; poll so a desktop MATLAB started later is detected.
  useEffect(() => {
    let active = true;
    const refresh = () => request('/api/matlab/setup')
      .then((payload) => { if (active) setMatlabSetup(payload); })
      .catch(() => { if (active) setMatlabSetup(null); });
    refresh();
    const timer = window.setInterval(refresh, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const handleMatlabToggle = async (enabled) => {
    setMatlabBusy(true);
    try {
      const payload = await request('/api/matlab/enable', {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      setMatlabSetup((current) => ({ ...current, ...payload }));
      notify({
        title: enabled ? 'Live MATLAB enabled' : 'Live MATLAB switched off',
        tone: 'success',
      });
    } catch (cause) {
      notify({ title: 'MATLAB could not be switched', description: cause.message, tone: 'error' });
    } finally {
      setMatlabBusy(false);
    }
  };

  const handleMatlabConnect = async (event) => {
    event.preventDefault();
    setMatlabBusy(true);
    try {
      const connected = await request('/api/matlab/configure', {
        method: 'POST',
        body: JSON.stringify(matlabForm),
      });
      setMatlabSetup((current) => ({ ...current, ...connected }));
      // Clear the secret from React state as soon as the server has it.
      setMatlabForm({ url: '', token: '', certificatePath: '' });
      const enabled = await request('/api/matlab/enable', {
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
      });
      setMatlabSetup((current) => ({ ...current, ...enabled }));
      notify({
        title: 'Live MATLAB connected',
        description: 'Predefined scenarios now call your desktop MATLAB.',
        tone: 'success',
      });
    } catch (cause) {
      notify({ title: 'MATLAB could not connect', description: cause.message, tone: 'error' });
    } finally {
      setMatlabBusy(false);
    }
  };

  const handleMatlabDisconnect = async () => {
    setMatlabBusy(true);
    try {
      const cleared = await request('/api/matlab/clear', { method: 'POST', body: '{}' });
      setMatlabSetup((current) => ({ ...current, ...cleared }));
      notify({ title: 'MATLAB disconnected', description: 'Saved results are active again.', tone: 'info' });
    } catch (cause) {
      notify({ title: 'MATLAB could not be cleared', description: cause.message, tone: 'error' });
    } finally {
      setMatlabBusy(false);
    }
  };

  const handleClear = () => {
    try {
      clearReports();
      notify({ title: 'Saved reports cleared', description: 'All template reports were removed from this browser.', tone: 'success' });
    } catch (cause) {
      notify({ title: 'Reports could not be cleared', description: cause.message, tone: 'error' });
    } finally {
      setConfirmClear(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Your interface preferences, the app's fixed guarantees, and local data. Nothing here leaves this browser."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="preferences-heading" className="surface p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-accent" />
            <h2 id="preferences-heading" className="section-title">
              Your preferences
            </h2>
          </div>
          <p className="mt-1 prose-note">
            Two local switches and a replayable intro. Nothing is sent anywhere.
          </p>

          <div className="mt-4 space-y-2">
            <Switch
              checked={preferences.reduceMotion}
              onChange={(value) => onChangePreferences({ reduceMotion: value })}
              label="Reduce motion"
              description="Disable panel fades, hover movement and the sidebar transition. The operating-system reduced-motion setting is always respected."
            />
            <Switch
              checked={preferences.sidebarCollapsed}
              onChange={(value) => onChangePreferences({ sidebarCollapsed: value })}
              label="Start with sidebar collapsed"
              description="Give the workspace more room on load. The sidebar toggle still works at any time."
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onChangePreferences(DEFAULT_PREFERENCES);
                notify({ title: 'Preferences reset', tone: 'info' });
              }}
              className="btn-secondary btn-xs"
            >
              <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
              Reset preferences
            </button>
            <button type="button" onClick={onReopenGuide} className="btn-secondary btn-xs">
              <BookOpen aria-hidden="true" className="h-3.5 w-3.5" />
              Replay welcome guide
            </button>
          </div>
        </section>

        <section aria-labelledby="guarantees-heading" className="surface p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-ok" />
            <h2 id="guarantees-heading" className="section-title">
              App guarantees
            </h2>
          </div>
          <p className="mt-1 prose-note">
            Always on by design. These describe the architecture, so they are not switches.
          </p>
          <ul className="mt-4 space-y-2">
            {GUARANTEES.map((item) => (
              <li key={item.label} className="flex items-start gap-3 rounded-lg border border-line bg-sunken/50 p-3.5">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">{item.label}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-muted">{item.detail}</p>
                </div>
                <span className="shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-wide text-muted">
                  always on
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="data-heading" className="surface p-5">
          <div className="flex items-center gap-2">
            <Database aria-hidden="true" className="h-4 w-4 text-analysis" />
            <h2 id="data-heading" className="section-title">
              Stored data
            </h2>
          </div>
          <p className="mt-1 prose-note">
            Template reports live in this browser under a single local storage key. Clearing them cannot
            be undone, and there is no cloud copy.
          </p>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-sunken/50 p-3.5">
            <div>
              <p className="text-[13px] font-medium text-ink">Saved reports</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted">{reports.length} of 20 stored</p>
            </div>
            <a href="#/saved" className="btn-secondary btn-xs">
              Manage
            </a>
          </div>

          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={reports.length === 0}
            className="btn-danger btn-xs mt-3"
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Clear saved reports
          </button>
          {reports.length === 0 && (
            <p className="mt-2 text-[11px] text-muted">Nothing to clear yet.</p>
          )}
        </section>

        <section aria-labelledby="services-heading" className="surface p-5">
          <div className="flex items-center gap-2">
            <Gauge aria-hidden="true" className="h-4 w-4 text-warn" />
            <h2 id="services-heading" className="section-title">
              Service status
            </h2>
          </div>
          <p className="mt-1 prose-note">
            Availability is reported honestly. A service that is not connected is never simulated.
          </p>

          <ul className="mt-3">
            <ServiceRow
              icon={online ? Wifi : WifiOff}
              label="Internet"
              state={online ? 'online' : 'offline'}
              tone={online ? 'ok' : 'warn'}
              detail={online ? 'A connection is present, but analysis does not depend on it.' : 'No connection. Predefined scenarios and saved reports still work.'}
            />
            <ServiceRow
              icon={Gauge}
              label="Live measurement"
              state={services?.networkMeasurement?.available ? 'available' : 'unavailable'}
              tone={services?.networkMeasurement?.available ? 'ok' : 'off'}
              detail={services?.networkMeasurement?.reason ?? 'The measurement runner did not load on this server.'}
            />
            <ServiceRow
              icon={Database}
              label="Saved results"
              state={services?.savedResults ? `${services.savedResults.count} loaded` : 'checking'}
              tone={services?.savedResults?.available ? 'ok' : 'off'}
              detail="Reference-verified fixtures served by the local execution interface."
            />
          </ul>
        </section>

        <section aria-labelledby="matlab-heading" className="surface p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Cpu aria-hidden="true" className="h-4 w-4 text-accent" />
            <h2 id="matlab-heading" className="section-title">
              Execution engine
            </h2>
          </div>
          <p className="mt-1 prose-note">
            Saved results are the safe default. Live MATLAB is opt-in and only works with a configured
            desktop MATLAB REST service.
          </p>

          <div className="mt-4">
            <Switch
              checked={Boolean(matlabSetup?.execution?.matlabLiveEnabled)}
              onChange={handleMatlabToggle}
              disabled={!matlabSetup?.bridge?.configured || matlabBusy}
              label="Use live MATLAB for analysis"
              description={
                matlabSetup?.bridge?.configured
                  ? 'When on, every module calls MATLAB through POST /api/execute. When off, saved MATLAB results are used.'
                  : 'Locked until a desktop MATLAB REST Function Service is connected.'
              }
            />
          </div>

          <form onSubmit={handleMatlabConnect} className="mt-3 space-y-2 rounded-lg border border-line bg-sunken/50 p-3.5">
            <p className="meta-label">Connect desktop MATLAB</p>
            <div className="grid gap-2 md:grid-cols-2">
              <label htmlFor="matlab-rest-url" className="block">
                <span className="mb-1 block text-[11px] text-muted">REST URL</span>
                <input
                  id="matlab-rest-url"
                  name="matlabRestUrl"
                  type="url"
                  required
                  value={matlabForm.url}
                  onChange={(event) => setMatlabForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://localhost:9920/matlab/feval/v1/FlowMetrica"
                  className="w-full rounded-lg border border-line bg-raised px-3 py-2 font-mono text-[11.5px] text-ink outline-none placeholder:text-muted focus:border-accent/60"
                />
              </label>
              <label htmlFor="matlab-token" className="block">
                <span className="mb-1 block text-[11px] text-muted">Passkey / REST token</span>
                <input
                  id="matlab-token"
                  name="matlabToken"
                  type="password"
                  required
                  autoComplete="off"
                  value={matlabForm.token}
                  onChange={(event) => setMatlabForm((current) => ({ ...current, token: event.target.value }))}
                  placeholder="Paste info.RESTPersonalAccessToken"
                  className="w-full rounded-lg border border-line bg-raised px-3 py-2 font-mono text-[11.5px] text-ink outline-none placeholder:text-muted focus:border-accent/60"
                />
              </label>
            </div>
            <label htmlFor="matlab-ca-path" className="block">
              <span className="mb-1 block text-[11px] text-muted">CA certificate path (optional)</span>
              <input
                id="matlab-ca-path"
                name="matlabCertificatePath"
                type="text"
                value={matlabForm.certificatePath}
                onChange={(event) => setMatlabForm((current) => ({ ...current, certificatePath: event.target.value }))}
                placeholder="Server-side path from info.CertificateLocation"
                className="w-full rounded-lg border border-line bg-raised px-3 py-2 font-mono text-[11.5px] text-ink outline-none placeholder:text-muted focus:border-accent/60"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="submit" disabled={matlabBusy} className="btn-primary btn-xs">
                Connect & enable
              </button>
              <button type="button" onClick={handleMatlabDisconnect} disabled={matlabBusy} className="btn-secondary btn-xs">
                Disconnect
              </button>
            </div>
          </form>

          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Status: <span className="font-mono text-ink">{matlabSetup?.bridge?.configured ? 'bridge configured' : 'not configured'}</span>
            {matlabSetup?.bridge?.verifiedAt ? ` · last verified ${formatDateTime(matlabSetup.bridge.verifiedAt)}` : ''}
          </p>
          {!matlabSetup?.bridge?.configured && (
            <p className="mt-1 text-[11px] leading-relaxed text-warn">
              {matlabSetup?.bridge?.reason ?? 'Checking the MATLAB bridge…'}
            </p>
          )}
          <p className="mt-3 rounded-lg border border-line bg-sunken/50 p-3 text-[11px] leading-relaxed text-muted">
            MATLAB Online has no supported external execution API. The token stays in server memory,
            is never echoed back, and is cleared on restart. Only localhost/private MATLAB services are accepted.
          </p>
        </section>

        <section aria-labelledby="about-heading" className="surface p-5 lg:col-span-2">
          <h2 id="about-heading" className="section-title">
            About FlowMetrica
          </h2>
          <dl className="mt-3 space-y-2 text-[12px]">
            <div className="flex justify-between gap-3 border-b border-line/60 pb-2">
              <dt className="text-muted">Version</dt>
              <dd className="font-mono text-ink">{health?.appVersion ?? '0.1.0-mvp'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line/60 pb-2">
              <dt className="text-muted">Predefined scenarios</dt>
              <dd className="font-mono text-ink">{services?.scenarios?.count ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-line/60 pb-2">
              <dt className="text-muted">Saved result fixtures</dt>
              <dd className="font-mono text-ink">{services?.savedResults?.count ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Execution</dt>
              <dd className="font-mono text-ink">POST /api/execute</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg border border-line bg-sunken/50 p-3 text-[11px] leading-relaxed text-muted">
            Every matrix, RREF, step list and solution is returned by the shared execution interface.
            This interface never solves a system in the browser, and reports are labelled
            Template-Based Report.
          </p>

          <div className="mt-4 border-t border-line pt-4">
            <p className="meta-label">Developer</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href="https://github.com/ZAYNINFINITY"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-sunken/50 px-3 py-2 text-[12.5px] text-muted transition-colors hover:border-accent/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <GitHubMark className="h-4 w-4 shrink-0 text-ink/70" />
                <span className="font-mono">ZAYNINFINITY</span>
              </a>
              <a
                href="https://www.linkedin.com/in/zain-ul-abideen-429735231"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-line bg-sunken/50 px-3 py-2 text-[12.5px] text-muted transition-colors hover:border-accent/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <LinkedInMark className="h-4 w-4 shrink-0 text-ink/70" />
                <span>Zain Ul Abideen</span>
              </a>
            </div>
          </div>
        </section>

      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear all saved reports?"
        description={`${reports.length} template report${reports.length === 1 ? '' : 's'} will be permanently removed from this browser. Generated reports cannot be recovered.`}
        confirmLabel="Clear all reports"
        onConfirm={handleClear}
        onClose={() => setConfirmClear(false)}
      />
    </div>
  );
}
