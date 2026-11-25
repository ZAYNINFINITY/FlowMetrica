import { ChevronDown } from 'lucide-react';

import MatrixViewer from './MatrixViewer.jsx';

/** Collapsible row operations: a readable sequence instead of a wall of matrices. */
export default function StepList({ steps }) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return <p className="prose-note">No row operations were recorded for this system.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="prose-note">
        {steps.length} recorded row operation{steps.length === 1 ? '' : 's'}. Open a step to inspect
        the matrix it produced.
      </p>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <li key={`${step.operation}-${index}`} className="overflow-hidden rounded-lg border border-line bg-sunken/70">
            <details className="group" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-raised/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 [&::-webkit-details-marker]:hidden">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded border border-line bg-raised font-mono text-[10px] text-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[12.5px] text-accent">
                    {step.operation}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{step.reason}</span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="space-y-2 border-t border-line px-3 py-3">
                <MatrixViewer matrix={step.matrix} augmented dense caption="Augmented matrix after this operation" />
              </div>
            </details>
          </li>
        ))}
      </ol>
    </div>
  );
}
