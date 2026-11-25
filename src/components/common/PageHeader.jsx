import { motion } from 'motion/react';

import { rise, stagger } from '../../lib/motion.js';

export default function PageHeader({ eyebrow, title, description, actions, meta }) {
  return (
    <motion.header
      className="flex flex-col gap-4 border-b border-line/70 pb-5 sm:flex-row sm:items-start sm:justify-between"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <div className="min-w-0">
        {eyebrow && (
          <motion.p
            variants={rise}
            className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent"
          >
            <span aria-hidden="true" className="h-px w-4 bg-accent/60" />
            {eyebrow}
          </motion.p>
        )}
        <motion.h1
          variants={rise}
          className="font-display text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]"
        >
          {title}
        </motion.h1>
        {description && (
          <motion.p
            variants={rise}
            className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-muted"
          >
            {description}
          </motion.p>
        )}
        {meta && (
          <motion.div variants={rise} className="mt-3 flex flex-wrap items-center gap-2">
            {meta}
          </motion.div>
        )}
      </div>
      {actions && (
        <motion.div variants={rise} className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </motion.div>
      )}
    </motion.header>
  );
}
