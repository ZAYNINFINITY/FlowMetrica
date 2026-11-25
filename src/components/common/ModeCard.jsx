/**
 * Selectable mode tile. Modes are real: choosing one changes what the page
 * shows. An unavailable mode reveals an explanation instead of a fake control.
 */
export default function ModeCard({
  icon: Icon,
  title,
  description,
  status,
  statusTone = 'active',
  active,
  onClick,
  meta,
}) {
  const tone =
    statusTone === 'unavailable'
      ? 'border-dashed border-warn/35 bg-warn/5 hover:border-warn/55'
      : 'border-line bg-panel hover:border-accent/40';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 ${
        active ? 'border-accent/60 bg-accent/10 ring-1 ring-accent/20' : tone
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg border ${
            active
              ? 'border-accent/40 bg-accent/10 text-accent'
              : statusTone === 'unavailable'
                ? 'border-warn/30 bg-warn/10 text-warn'
                : 'border-line bg-raised text-muted'
          }`}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span
          className={`chip ${
            statusTone === 'unavailable'
              ? 'border-warn/30 bg-warn/10 text-warn'
              : active
                ? 'border-accent/30 bg-accent/10 text-accent'
                : ''
          }`}
        >
          {status}
        </span>
      </div>

      <span className="mt-3 card-title">{title}</span>
      <span className="mt-1 text-[12px] leading-relaxed text-muted">{description}</span>
      {meta && <span className="mt-3 font-mono text-[10px] uppercase tracking-wide text-muted/80">{meta}</span>}
    </button>
  );
}
