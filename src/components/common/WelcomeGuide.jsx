import { useEffect, useRef } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowRight, Network, ScanSearch, Sigma, X } from 'lucide-react';

/** Four plain-language beats. No jargon is required to follow the chain. */
const STEPS = [
  { Icon: Network, label: 'Network', text: 'Junctions and links form a small teaching model.' },
  { Icon: ArrowRight, label: 'Flows', text: 'The unknown is how much traffic uses each link.' },
  { Icon: Sigma, label: 'Equations', text: 'What goes in must come out becomes a linear system.' },
  { Icon: ScanSearch, label: 'Investigation', text: 'The server solves it; the modules explore the result.' },
];

/**
 * First-visit orientation. It explains the idea, not the implementation: a
 * network story becomes equations, and the answer is shown with its source.
 */
export default function WelcomeGuide({ open, reduceMotion, onClose }) {
  const primaryRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    restoreRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primaryRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [open, onClose]);

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <AnimatePresence>
        {open && (
          <motion.div
            className="no-print fixed inset-0 z-[80] flex items-center justify-center bg-base/80 p-3 backdrop-blur-sm sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) onClose();
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="welcome-title"
              aria-describedby="welcome-copy"
              className="surface relative w-full max-w-xl overflow-hidden p-5 shadow-2xl sm:p-7"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close introduction"
                className="absolute right-3 top-3 rounded-md p-1 text-muted transition-colors hover:bg-raised hover:text-ink"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>

              <p className="meta-label">Welcome to FlowMetrica</p>
              <h2
                id="welcome-title"
                className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl"
              >
                A network story, turned into math you can see.
              </h2>
              <p id="welcome-copy" className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-muted">
                Like a CT scan for a small teaching network, FlowMetrica takes what enters and
                leaves each junction, turns it into equations, and shows the answer behind them.
              </p>

              <ol className="mt-5 grid gap-2 sm:grid-cols-4">
                {STEPS.map(({ Icon, label, text }) => (
                  <li key={label} className="rounded-lg border border-line bg-sunken/60 p-3">
                    <Icon aria-hidden="true" className="h-4 w-4 text-accent" />
                    <p className="mt-2 font-display text-[13px] font-semibold text-ink">{label}</p>
                    <p className="mt-1 text-[11px] leading-snug text-muted">{text}</p>
                  </li>
                ))}
              </ol>

              <p className="mt-4 rounded-lg border border-analysis/25 bg-analysis/5 p-3 text-[11.5px] leading-relaxed text-muted">
                In short:{' '}
                <span className="font-mono text-ink">
                  nodes + links → flows → equations → investigation
                </span>
                . Saved teaching scenarios work offline; nothing is measured live by default.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button ref={primaryRef} type="button" onClick={onClose} className="btn-primary">
                  Explore FlowMetrica
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
                <button type="button" onClick={onClose} className="btn-secondary">
                  Skip intro
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
