import { useState } from 'react';
import {
  Database,
  Gauge,
  RotateCcw,
  Settings as SettingsIcon,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';

import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import ErrorState from '../components/common/ErrorState.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import { useToast } from '../components/common/Toast.jsx';
import { useReports } from '../hooks/useReports.js';
import { formatDateTime } from '../lib/format.js';
import { DEFAULT_PREFERENCES } from '../lib/settings.js';

function Switch({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-line bg-sunken/50 p-3.5">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">{description}</span>
      </span>
      <span className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
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

export default function Settings({ preferences, onChangePreferences, health, online }) {
  const { reports, clearReports } = useReports();
  const notify = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  const services = health?.services;

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
        description="Local interface preferences and stored data. Nothing here leaves this browser."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="appearance-heading" className="surface p-5">
          <div className="flex items-center gap-2">
            <SettingsIcon aria-hidden="true" className="h-4 w-4 text-accent" />
            <h2 id="appearance-heading" className="section-title">
              Appearance &amp; motion
            </h2>
          </div>
          <p className="mt-1 prose-note">
            Motion is decorative in FlowMetrica. Every result stays readable when animations are off.
          </p>

          <div className="mt-4 space-y-2">
            <Switch
              checked={preferences.reduceMotion}
              onChange={(value) => onChangePreferences({ reduceMotion: value })}
              label="Reduce motion"
              description="Disable panel fades, hover movement and the sidebar transition. The operating-system reduced-motion setting is always respected."
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onChangePreferences(DEFAULT_PREFERENCES);
              notify({ title: 'Preferences reset', tone: 'info' });
            }}
            className="btn-secondary btn-xs mt-3"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            Reset preferences
          </button>
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

        <section aria-labelledby="about-heading" className="surface p-5">
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
