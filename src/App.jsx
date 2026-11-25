import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';

import Sidebar from './components/layout/Sidebar.jsx';
import Topbar from './components/layout/Topbar.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import { useReports } from './hooks/useReports.js';
import { getHealth, getScenario, getScenarios } from './lib/api.js';
import { loadPreferences, savePreferences } from './lib/settings.js';
import { pageOptions, pageTransition } from './lib/motion.js';
import AnomalyDetection from './pages/AnomalyDetection.jsx';
import Dashboard from './pages/Dashboard.jsx';
import HowItWorks from './pages/HowItWorks.jsx';
import Investigation from './pages/Investigation.jsx';
import SavedInvestigations from './pages/SavedInvestigations.jsx';
import Settings from './pages/Settings.jsx';
import TrafficAnalysis from './pages/TrafficAnalysis.jsx';

const VIEWS = {
  dashboard: { title: 'Dashboard', crumb: ['Workspace', 'Dashboard'], Component: Dashboard },
  overview: {
    title: 'How it works',
    crumb: ['Workspace', 'How it works'],
    Component: HowItWorks,
  },
  module1: {
    title: 'Network Traffic Analysis',
    crumb: ['Analysis', 'Traffic Analysis'],
    Component: TrafficAnalysis,
  },
  module2: {
    title: 'Network Anomaly Detection',
    crumb: ['Analysis', 'Anomaly Detection'],
    Component: AnomalyDetection,
  },
  module3: {
    title: 'Incident Investigation',
    crumb: ['Analysis', 'Investigation'],
    Component: Investigation,
  },
  saved: {
    title: 'Saved Investigations',
    crumb: ['Workspace', 'Saved Investigations'],
    Component: SavedInvestigations,
  },
  settings: { title: 'Settings', crumb: ['Workspace', 'Settings'], Component: Settings },
};

function readView() {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return Object.hasOwn(VIEWS, hash) ? hash : 'dashboard';
}

export default function App() {
  const [view, setView] = useState(readView);
  const [health, setHealth] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { reports } = useReports();

  const current = VIEWS[view] ?? VIEWS.dashboard;
  const Page = current.Component;

  useEffect(() => {
    const sync = () => setView(readView());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [healthResult, scenarioResult] = await Promise.allSettled([getHealth(), getScenarios()]);

    if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
    if (scenarioResult.status === 'fulfilled') {
      setScenarios(scenarioResult.value.scenarios);
    } else {
      setScenarios([]);
      setError(scenarioResult.reason?.message ?? 'The local service did not return scenarios.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Topology previews are read from the same scenario definitions the modules use.
  useEffect(() => {
    if (scenarios.length === 0) return undefined;
    let active = true;

    Promise.allSettled(
      scenarios.map(async (summary) => {
        const payload = await getScenario(summary.module, summary.id);
        return [summary.id, payload.scenario];
      }),
    ).then((results) => {
      if (!active) return;
      const next = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [id, scenario] = result.value;
          next[id] = scenario;
        }
      });
      setDetails(next);
    });

    return () => {
      active = false;
    };
  }, [scenarios]);

  const updatePreferences = useCallback((patch) => {
    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      savePreferences(next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.motion = preferences.reduceMotion ? 'reduced' : 'full';
  }, [preferences.reduceMotion]);

  useEffect(() => {
    document.title = `${current.title} · FlowMetrica`;
    // Move focus out of the sidebar nav: it is a scroll container, so keeping
    // focus on a nav link can swallow PageDown/Space and freeze page scrolling.
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setMobileOpen(false);
  }, [view, current.title]);

  return (
    <ToastProvider>
      <button
        type="button"
        onClick={() => document.getElementById('main-content')?.focus()}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-ink"
      >
        Skip to content
      </button>

      <div className="flex min-h-screen">
        <Sidebar
          view={view}
          collapsed={preferences.sidebarCollapsed}
          onToggleCollapsed={() => updatePreferences({ sidebarCollapsed: !preferences.sidebarCollapsed })}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
          version={health?.appVersion}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            title={current.title}
            breadcrumb={current.crumb}
            online={online}
            onOpenMobile={() => setMobileOpen(true)}
          />

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-3 py-5 focus:outline-none sm:px-6 sm:py-6 lg:px-8"
          >
            <MotionConfig reducedMotion={preferences.reduceMotion ? 'always' : 'user'}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={view}
                  variants={pageTransition}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageOptions}
                  className="mx-auto w-full max-w-[1440px]"
                >
                  <Page
                    scenarios={scenarios}
                    details={details}
                    health={health}
                    loading={loading}
                    error={error}
                    onRetry={loadServices}
                    online={online}
                    reports={reports}
                    preferences={preferences}
                    onChangePreferences={updatePreferences}
                  />
                </motion.div>
              </AnimatePresence>
            </MotionConfig>
          </main>

          <footer className="no-print border-t border-line px-4 py-2.5 text-[10.5px] text-muted sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-1 sm:flex-row sm:items-center sm:gap-x-4">
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-mono">FlowMetrica v{health?.appVersion ?? '0.1.0-mvp'}</span>
                <span>Results served by the local execution interface</span>
              </div>
              <span className="shrink-0 whitespace-nowrap font-mono sm:ml-auto">offline-first</span>
            </div>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
