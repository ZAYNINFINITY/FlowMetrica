import { BaseEdge, EdgeLabelRenderer, getStraightPath, useInternalNode } from '@xyflow/react';

const COLORS = {
  normal: '#22D3EE',
  failed: '#EF4444',
  restored: '#22C55E',
};

const STROKE_WIDTH = {
  normal: 1.6,
  failed: 2,
  restored: 2.1,
};

/** Where a line from one node centre leaves this node's box. */
function boxIntersection(node, otherNode) {
  const width = node.measured?.width ?? 112;
  const height = node.measured?.height ?? 48;
  const otherWidth = otherNode.measured?.width ?? 112;
  const otherHeight = otherNode.measured?.height ?? 48;
  const w = width / 2;
  const h = height / 2;
  const cx = node.internals.positionAbsolute.x + w;
  const cy = node.internals.positionAbsolute.y + h;
  const ox = otherNode.internals.positionAbsolute.x + otherWidth / 2;
  const oy = otherNode.internals.positionAbsolute.y + otherHeight / 2;
  const dx = (ox - cx) / (2 * w) - (oy - cy) / (2 * h);
  const dy = (ox - cx) / (2 * w) + (oy - cy) / (2 * h);
  const scale = 1 / (Math.abs(dx) + Math.abs(dy) || 1);
  return {
    x: w * (dx * scale + dy * scale) + cx,
    y: h * (-dx * scale + dy * scale) + cy,
  };
}

/**
 * Floating straight edge: endpoints attach to the node box, so the fixture
 * coordinates can describe any layout without hand-placed handles.
 */
export default function NetworkEdge({ id, source, target, data, markerEnd }) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const from = boxIntersection(sourceNode, targetNode);
  const to = boxIntersection(targetNode, sourceNode);
  const [path, labelX, labelY] = getStraightPath({
    sourceX: from.x,
    sourceY: from.y,
    targetX: to.x,
    targetY: to.y,
  });

  const status = COLORS[data?.status] ? data.status : 'normal';
  const color = COLORS[status];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const offsetX = (-dy / length) * 11;
  const offsetY = (dx / length) * 11;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: STROKE_WIDTH[status],
          strokeDasharray: status === 'failed' ? '6 5' : undefined,
        }}
        interactionWidth={0}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <span
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX + offsetX}px, ${labelY + offsetY}px)`,
              color,
            }}
            className="pointer-events-none select-none rounded border border-line/80 bg-base/90 px-1 py-0.5 font-mono text-[10px] leading-none"
          >
            {data.label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
