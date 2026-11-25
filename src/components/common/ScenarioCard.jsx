import { ArrowRight, Check } from 'lucide-react';

import TopologyThumbnail from '../visualization/TopologyThumbnail.jsx';
import { complexityLabel, severityTone } from '../../lib/format.js';

/**
 * Scenario summary card. Counts come from the scenarios endpoint; the preview
 * comes from the real topology definition, never from invented geometry.
 */
export default function ScenarioCard({ scenario, topology, active = false, onOpen, showSeverity = false }) {
  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border bg-panel transition-colors ${
        active ? 'border-accent/60 ring-1 ring-accent/20' : 'border-line hover:border-line/80'
      }`}
    >
      <div className="relative h-28 border-b border-line bg-rail">
        {topology ? (
          <TopologyThumbnail
            topology={topology}
            label={`Topology preview for ${scenario.title}`}
            className="opacity-90"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <span className="text-[11px] text-muted">Topology preview unavailable</span>
          </div>
        )}
        {active && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded border border-accent/40 bg-base/90 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            <Check aria-hidden="true" className="h-3 w-3" />
            Viewing
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip">{complexityLabel(scenario.complexity)}</span>
          {showSeverity && scenario.severity && (
            <span className={`chip ${severityTone(scenario.severity)}`}>
              {String(scenario.severity)} severity
            </span>
          )}
        </div>

        <div>
          <h3 className="card-title">{scenario.title}</h3>
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{scenario.summary}</p>
        </div>

        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
          <div className="flex gap-1.5">
            <dt className="text-muted/80">nodes</dt>
            <dd className="text-ink">{scenario.nodeCount}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted/80">links</dt>
            <dd className="text-ink">{scenario.edgeCount}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted/80">id</dt>
            <dd className="truncate text-ink">{scenario.id}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => onOpen(scenario.id)}
          className={`${active ? 'btn-secondary' : 'btn-primary'} btn-xs w-full`}
          aria-label={active ? `Re-run analysis for ${scenario.title}` : `Open scenario ${scenario.title}`}
        >
          {active ? 'Re-run analysis' : 'Open scenario'}
          {!active && <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />}
        </button>
      </div>
    </article>
  );
}
