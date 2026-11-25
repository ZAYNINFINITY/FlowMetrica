const TONES = {
  ok: 'border-ok/35 bg-ok/10 text-ok',
  warn: 'border-warn/35 bg-warn/10 text-warn',
  off: 'border-line bg-raised/70 text-muted',
  unknown: 'border-line bg-raised/50 text-muted',
};

/**
 * Service indicator: icon + name + explicit state word. Colour is decoration,
 * never the only signal.
 */
export default function StatusPill({ icon: Icon, label, state, tone = 'off', detail, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${TONES[tone] ?? TONES.off} ${className}`}
      title={detail}
    >
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
      <span className="hidden font-medium text-ink sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}: </span>
      <span className="font-mono text-[10.5px] uppercase tracking-wide">{state}</span>
    </span>
  );
}
