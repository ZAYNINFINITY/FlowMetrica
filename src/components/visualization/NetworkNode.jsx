import { Handle, Position } from '@xyflow/react';
import { splitNodeLabel } from '../../lib/format.js';

const RING = {
  normal: 'border-line',
  failed: 'border-danger/70',
  restored: 'border-ok/70',
};

const DOT = {
  normal: 'bg-accent',
  failed: 'bg-danger',
  restored: 'bg-ok',
};

/**
 * Custom React Flow node. Selection is a real <button> so keyboard users can
 * pick a router without relying on pointer drag gestures.
 */
export default function NetworkNode({ data }) {
  const { id, role } = splitNodeLabel(data.label, data.id);
  const selected = Boolean(data.selected);
  const status = data.status ?? 'normal';

  const inner = (
    <>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} />
        <span className="font-mono text-[12px] font-semibold leading-none text-ink">{id}</span>
      </span>
      {role && <span className="mt-1 block truncate text-[10px] leading-none text-muted">{role}</span>}
      {status !== 'normal' && (
        <span className="sr-only">{status === 'failed' ? 'Affected by a failed link' : 'On a backup route'}</span>
      )}
    </>
  );

  const shell = `min-w-[104px] max-w-[128px] rounded-lg border bg-panel px-2.5 py-2 text-left shadow-pop transition-colors ${
    RING[status]
  } ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-rail' : ''}`;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-px !w-px !min-w-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
      {data.interactive ? (
        <button
          type="button"
          onClick={() => data.onSelect?.(data.id)}
          aria-pressed={selected}
          aria-label={`Select router ${id}${role ? `, ${role}` : ''}${status === 'failed' ? ', affected by a failed link' : ''}`}
          className={`${shell} cursor-pointer hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-rail`}
        >
          {inner}
        </button>
      ) : (
        <div className={shell}>{inner}</div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-px !w-px !min-w-0 !border-0 !bg-transparent"
        isConnectable={false}
      />
    </div>
  );
}
