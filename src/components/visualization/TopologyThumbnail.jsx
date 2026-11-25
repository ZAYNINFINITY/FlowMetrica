const STROKES = {
  normal: '#22D3EE',
  failed: '#EF4444',
  restored: '#22C55E',
};

function endpointInset(from, to, inset = 20) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x1: from.x + (dx / length) * inset,
    y1: from.y + (dy / length) * inset,
    x2: to.x - (dx / length) * inset,
    y2: to.y - (dy / length) * inset,
  };
}

/**
 * Static thumbnail built from real topology coordinates. Used only where the
 * canvas is a preview (cards); the interactive workspace uses NetworkCanvas.
 */
export default function TopologyThumbnail({ topology, label = 'Network topology preview', className = '' }) {
  if (!topology?.nodes?.length) return null;

  const xs = topology.nodes.map((node) => node.x);
  const ys = topology.nodes.map((node) => node.y);
  const pad = 38;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const height = Math.max(...ys) - Math.min(...ys) + pad * 2;
  const nodes = new Map(topology.nodes.map((node) => [node.id, node]));
  const markerId = `thumb-${String(label).replace(/\W+/g, '')}-${topology.nodes.length}-${topology.edges.length}`;

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      className={`h-full w-full ${className}`}
    >
      <defs>
        {Object.entries(STROKES).map(([status, color]) => (
          <marker
            key={status}
            id={`${markerId}-${status}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>

      {topology.edges.map((edge) => {
        const from = nodes.get(edge.from);
        const to = nodes.get(edge.to);
        if (!from || !to) return null;
        const status = STROKES[edge.status] ? edge.status : 'normal';
        const { x1, y1, x2, y2 } = endpointInset(from, to);
        return (
          <g key={edge.id}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={STROKES[status]}
              strokeWidth={status === 'normal' ? 1.6 : 2}
              strokeDasharray={status === 'failed' ? '6 5' : undefined}
              markerEnd={`url(#${markerId}-${status})`}
            />
            <text
              x={(x1 + x2) / 2}
              y={(y1 + y2) / 2 - 7}
              textAnchor="middle"
              fontSize="11"
              fontFamily="'JetBrains Mono', monospace"
              fill={STROKES[status]}
            >
              {edge.label}
            </text>
          </g>
        );
      })}

      {topology.nodes.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r="17" fill="#162337" stroke="#3B4D66" strokeWidth="1.5" />
          <text
            x={node.x}
            y={node.y + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fontFamily="'JetBrains Mono', monospace"
            fill="#F1F5F9"
          >
            {node.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
