import {
  BookOpen,
  FileText,
  FolderSearch,
  LayoutDashboard,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ScanSearch,
  Settings,
  ShieldAlert,
  Waypoints,
  X,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'overview', label: 'How it works', Icon: BookOpen },
  { id: 'module1', label: 'Network Traffic Analysis', short: 'Traffic Analysis', Icon: Network },
  { id: 'module2', label: 'Anomaly Detection', Icon: ShieldAlert },
  { id: 'module3', label: 'Incident Investigation', short: 'Investigation', Icon: ScanSearch },
  { id: 'saved', label: 'Saved Investigations', Icon: FolderSearch },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

function NavItem({ item, active, collapsed, onNavigate }) {
  const { Icon } = item;
  return (
    <a
      href={`#/${item.id}`}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? undefined : item.label}
      className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
        collapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-accent/10 text-accent'
          : 'text-muted hover:bg-raised/70 hover:text-ink'
      }`}
    >
      {active && (
        <span aria-hidden="true" className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" />
      )}
      <Icon aria-hidden="true" className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-accent' : ''}`} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {collapsed && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-md border border-line bg-raised px-2 py-1 text-[11px] font-medium text-ink shadow-pop group-hover:block group-focus-visible:block"
        >
          {item.label}
        </span>
      )}
    </a>
  );
}

export default function Sidebar({
  view,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  version,
}) {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-base/75 backdrop-blur-sm transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-line bg-rail transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0 ${
          mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full lg:visible'
        } ${collapsed ? 'lg:w-[74px]' : 'lg:w-[252px]'}`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-line px-3">
          <a
            href="#/dashboard"
            onClick={onCloseMobile}
            className="flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            aria-label="FlowMetrica home"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10">
              <Waypoints aria-hidden="true" className="h-4 w-4 text-accent" />
            </span>
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate font-display text-[14px] font-semibold tracking-tight text-ink">
                  FlowMetrica
                </span>
                <span className="block truncate text-[10px] uppercase tracking-[0.14em] text-muted">
                  Network Intelligence
                </span>
              </span>
            )}
          </a>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto rounded-md p-1.5 text-muted hover:bg-raised hover:text-ink lg:hidden"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <p className={`mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70 ${collapsed ? 'sr-only' : ''}`}>
            Workspace
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <NavItem
                  item={item}
                  active={view === item.id}
                  collapsed={collapsed}
                  onNavigate={onCloseMobile}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted hover:bg-raised hover:text-ink lg:flex ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
          <p className={`mt-2 truncate px-2 font-mono text-[10px] text-muted/70 ${collapsed ? 'hidden' : ''}`}>
            v{version ?? '0.1.0-mvp'} · offline-first
          </p>
        </div>
      </aside>
    </>
  );
}
