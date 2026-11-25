import { Menu, Settings, Wifi, WifiOff } from 'lucide-react';

import StatusPill from '../common/StatusPill.jsx';

function StatusGroup({ online }) {
  return (
    <StatusPill
      icon={online ? Wifi : WifiOff}
      label="Internet"
      state={online ? 'online' : 'offline'}
      tone={online ? 'ok' : 'warn'}
      detail={
        online
          ? 'A network connection is present. Predefined scenarios do not depend on it.'
          : 'No internet connection. Predefined scenarios and saved reports still work.'
      }
    />
  );
}

/** Mobile status disclosure keeps the single status pill readable on small screens. */
function MobileStatus({ online }) {
  return (
    <details className="relative md:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-line bg-sunken px-2 py-1 text-[11px] text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-ink">Status</span>
        <span aria-hidden="true" className="font-mono text-[10px]">
          {online ? 'ON' : 'OFF'}
        </span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-line bg-panel p-3 shadow-pop">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          Connection
        </p>
        <div className="flex gap-2.5">
          {online ? (
            <Wifi aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
          ) : (
            <WifiOff aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
          )}
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-ink">
              Internet <span className="font-mono text-[10px] uppercase text-muted">{online ? 'online' : 'offline'}</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">
              {online
                ? 'Connection present. Predefined scenarios still work.'
                : 'Offline. Predefined scenarios and saved reports still work.'}
            </p>
          </div>
        </div>
      </div>
    </details>
  );
}

export default function Topbar({ title, breadcrumb = [], online, onOpenMobile }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-base/85 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open navigation"
          className="rounded-md p-1.5 text-muted hover:bg-raised hover:text-ink lg:hidden"
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="hidden sm:block">
            <ol className="flex items-center gap-1.5 text-[11px] text-muted">
              {breadcrumb.map((crumb, index) => (
                <li key={`${crumb}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden="true" className="text-muted/50">/</span>}
                  <span className={index === breadcrumb.length - 1 ? 'text-ink' : ''}>{crumb}</span>
                </li>
              ))}
            </ol>
          </nav>
          <p className="truncate text-[13px] font-semibold text-ink sm:hidden">{title}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden items-center gap-1.5 md:flex">
            <StatusGroup online={online} />
          </div>
          <MobileStatus online={online} />
          <a
            href="#/settings"
            aria-label="Settings"
            title="Settings"
            className="hidden rounded-md border border-line bg-sunken p-1.5 text-muted transition-colors hover:text-ink sm:inline-flex"
          >
            <Settings aria-hidden="true" className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
}
