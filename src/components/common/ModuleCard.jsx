import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

import { pressable } from '../../lib/motion.js';

const ACCENTS = {
  cyan: {
    border: 'hover:border-accent/50',
    rail: 'from-accent/10',
    icon: 'border-accent/30 bg-accent/10 text-accent',
    text: 'text-accent',
  },
  danger: {
    border: 'hover:border-danger/50',
    rail: 'from-danger/10',
    icon: 'border-danger/30 bg-danger/10 text-danger',
    text: 'text-danger',
  },
  indigo: {
    border: 'hover:border-analysis/50',
    rail: 'from-analysis/10',
    icon: 'border-analysis/30 bg-analysis/10 text-analysis',
    text: 'text-analysis',
  },
};

/** Dashboard module tile: one visual language per module, one honest dataset. */
export default function ModuleCard({ index, title, description, href, icon: Icon, accent = 'cyan', chips = [], preview, footer }) {
  const tone = ACCENTS[accent] ?? ACCENTS.cyan;

  return (
    <motion.a
      href={href}
      {...pressable}
      className={`group flex flex-col overflow-hidden rounded-xl border border-line bg-panel transition-colors hover:shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${tone.border}`}
    >
      <div className={`relative h-36 overflow-hidden border-b border-line bg-gradient-to-br ${tone.rail} to-rail`}>
        {preview}
        <span className="absolute left-3 top-3 rounded border border-line bg-base/85 px-1.5 py-0.5 font-mono text-[10px] text-muted">
          {index}
        </span>
        <span className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-md border ${tone.icon}`}>
          <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-semibold tracking-tight text-ink">{title}</h3>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{description}</p>

        {chips.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <li key={chip} className="chip">{chip}</li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div className="min-w-0 text-[11px] text-muted">{footer}</div>
          <span className={`inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold ${tone.text}`}>
            Open module
            <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </motion.a>
  );
}
