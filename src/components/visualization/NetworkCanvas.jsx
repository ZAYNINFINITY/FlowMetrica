import { useId } from 'react';
import { Background, BackgroundVariant, Controls, MarkerType, ReactFlow } from '@xyflow/react';

import NetworkEdge from './NetworkEdge.jsx';
import NetworkNode from './NetworkNode.jsx';

const nodeTypes = { network: NetworkNode };
const edgeTypes = { network: NetworkEdge };

const EDGE_COLORS = {
  normal: '#22D3EE',
  failed: '#EF4444',
  restored: '#22C55E',
};

function buildNodes(topology, selectedId, interactive, onSelectNode) {
  const failedNodes = new Set();
  const restoredNodes = new Set();

  topology.edges.forEach((edge) => {
    if (edge.status === 'failed') {
      failedNodes.add(edge.from);
      failedNodes.add(edge.to);
    }
    if (edge.status === 'restored') {
      restoredNodes.add(edge.from);
      restoredNodes.add(edge.to);
    }
  });

  return topology.nodes.map((node) => ({
    id: node.id,
    type: 'network',
    position: { x: node.x, y: node.y },
    draggable: false,
    selectable: false,
    data: {
      id: node.id,
      label: node.label,
      status: failedNodes.has(node.id) ? 'failed' : restoredNodes.has(node.id) ? 'restored' : 'normal',
      selected: selectedId === node.id,
      interactive,
      onSelect: onSelectNode,
    },
  }));
}

function buildEdges(topology) {
  return topology.edges.map((edge) => {
    const status = EDGE_COLORS[edge.status] ? edge.status : 'normal';
    return {
      id: edge.id,
      type: 'network',
      source: edge.from,
      target: edge.to,
      data: { label: edge.label, status },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: EDGE_COLORS[status],
        width: 14,
        height: 14,
      },
    };
  });
}

function Legend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
      <li className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" width="18" height="6" viewBox="0 0 18 6">
          <line x1="1" y1="3" x2="17" y2="3" stroke="#22D3EE" strokeWidth="1.6" />
        </svg>
        Active link
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" width="18" height="6" viewBox="0 0 18 6">
          <line x1="1" y1="3" x2="17" y2="3" stroke="#EF4444" strokeWidth="2" strokeDasharray="5 4" />
        </svg>
        Failed link
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg aria-hidden="true" width="18" height="6" viewBox="0 0 18 6">
          <line x1="1" y1="3" x2="17" y2="3" stroke="#22C55E" strokeWidth="2.1" />
        </svg>
        Backup route
      </li>
    </ul>
  );
}

/**
 * One interactive topology surface for every module. `interactive={false}`
 * renders a non-focusable preview, so cards never expose dead controls.
 */
export default function NetworkCanvas({
  topology,
  label = 'Network topology',
  caption,
  height = 340,
  selectedId = null,
  onSelectNode,
  interactive = true,
  selectable = interactive,
  legend = true,
}) {
  const hintId = useId();

  if (!topology?.nodes?.length) return null;

  const nodes = buildNodes(topology, selectedId, selectable, onSelectNode);
  const edges = buildEdges(topology);

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label={label}
        aria-describedby={interactive ? hintId : undefined}
        className="overflow-hidden rounded-lg border border-line bg-rail"
        style={{ height }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.16, maxZoom: 1.15 }}
          minZoom={0.45}
          maxZoom={1.75}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesReconnectable={false}
          elementsSelectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          panOnDrag={interactive}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={interactive}
          zoomOnDoubleClick={interactive}
          preventScrolling={false}
          onPaneClick={() => interactive && selectable && onSelectNode?.(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#243247" />
          {interactive && <Controls showInteractive={false} position="bottom-right" />}
        </ReactFlow>
      </div>

      {interactive && (
        <p id={hintId} className="text-[11px] text-muted">
          {selectable
            ? 'Drag to pan, use the controls to zoom, or select a router for link details.'
            : 'Drag to pan and use the controls to zoom. Node selection is not used in this comparison view.'}
        </p>
      )}
      {legend && <Legend />}
      {caption && <p className="text-[11px] leading-relaxed text-muted">{caption}</p>}
    </div>
  );
}
