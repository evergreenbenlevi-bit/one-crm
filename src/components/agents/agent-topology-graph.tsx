"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import { useRouter } from "next/navigation";
import { TopologyNode } from "./topology-node";
import type { TopologyData, EdgeRelation } from "@/lib/types/agents";

import "@xyflow/react/dist/style.css";

const nodeTypes = { custom: TopologyNode };

const edgeStyles: Record<EdgeRelation, { stroke: string; strokeDasharray?: string; animated?: boolean }> = {
  dispatches: { stroke: "#3b82f6", animated: true },
  uses_skill: { stroke: "#22c55e", strokeDasharray: "5 5" },
  triggers_cron: { stroke: "#f97316", strokeDasharray: "3 3" },
  monitors: { stroke: "#a855f7", strokeDasharray: "8 4" },
  feeds: { stroke: "#06b6d4" },
};

const nodeSizes: Record<string, { width: number; height: number }> = {
  team: { width: 200, height: 80 },
  agent: { width: 170, height: 70 },
  bot: { width: 140, height: 60 },
  skill: { width: 130, height: 55 },
  cron: { width: 130, height: 55 },
  advisor: { width: 140, height: 60 },
};

function getLayoutedElements(data: TopologyData) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  for (const node of data.nodes) {
    const size = nodeSizes[node.type] || nodeSizes.agent;
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  for (const edge of data.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const nodes: Node[] = data.nodes.map((n) => {
    const pos = g.node(n.id);
    const size = nodeSizes[n.type] || nodeSizes.agent;
    return {
      id: n.id,
      type: "custom",
      position: { x: (pos?.x || 0) - size.width / 2, y: (pos?.y || 0) - size.height / 2 },
      data: {
        label: n.label,
        agentType: n.type,
        model: n.model,
        status: n.status,
        costToday: n.costToday,
        slug: n.id,
      },
    };
  });

  const edges: Edge[] = data.edges.map((e, i) => {
    const style = edgeStyles[e.relation] || edgeStyles.dispatches;
    return {
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      style: { stroke: style.stroke, strokeWidth: 2, strokeDasharray: style.strokeDasharray },
      animated: style.animated || false,
      label: e.relation === "dispatches" ? "" : e.relation.replace("_", " "),
      labelStyle: { fill: "#9ca3af", fontSize: 10 },
    };
  });

  return { nodes, edges };
}

interface Props {
  data: TopologyData;
}

export function AgentTopologyGraph({ data }: Props) {
  const router = useRouter();
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => getLayoutedElements(data), [data]);
  const [nodes, , onNodesChange] = useNodesState(layoutNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const slug = (node.data as { slug?: string })?.slug;
      if (slug) router.push(`/agents/registry/${slug}`);
    },
    [router]
  );

  return (
    <div className="w-full h-[calc(100vh-220px)] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={20} />
        <Controls
          position="bottom-left"
          className="!bg-gray-800 !border-gray-700 !rounded-xl [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700"
        />
        <MiniMap
          nodeColor={() => "#6b7280"}
          maskColor="rgba(0,0,0,0.7)"
          className="!bg-gray-800 !border-gray-700 !rounded-xl"
        />
      </ReactFlow>
    </div>
  );
}
