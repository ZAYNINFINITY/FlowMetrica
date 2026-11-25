import { useId } from 'react';
import { Lock } from 'lucide-react';

/**
 * Honest "not in this MVP" panel. It explains what is unavailable, why, and
 * what still works. It never renders a disabled fake control.
 */
export default function UnavailablePanel({ title, description, reason, bullets = [], action }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-xl border border-dashed border-warn/35 bg-warn/[0.04] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-warn/30 bg-warn/10 text-warn">
          <Lock aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            <span className="chip border-warn/30 bg-warn/10 text-warn">Unavailable in MVP</span>
          </div>
          {description && <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>}
          {reason && (
            <p className="mt-3 max-w-2xl rounded-lg border border-line bg-sunken/80 p-3 text-[12px] leading-relaxed text-muted">
              <span className="font-semibold text-ink">Why: </span>
              {reason}
            </p>
          )}
          {bullets.length > 0 && (
            <div className="mt-4">
              <p className="meta-label">Still works offline</p>
              <ul className="mt-2 grid gap-1.5 text-[13px] text-muted sm:grid-cols-2">
                {bullets.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {action && <div className="mt-5">{action}</div>}
        </div>
      </div>
    </section>
  );
}
