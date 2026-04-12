"use client";

import { useCallback, useMemo, useState } from "react";
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
import { NexusNode } from "./nexus-node";
import { NexusEdge } from "./nexus-edge";
import { AgentDetailPanel } from "./agent-detail-panel";
import { TracePanel } from "./trace-panel";
import type { TopologyData, TopologyNode as TNode, EdgeRelation, AgentType } from "@/lib/types/agents";

import "@xyflow/react/dist/style.css";

const nodeTypes = { nexus: NexusNode };
const edgeTypes = { nexus: NexusEdge };

const nodeSizes: Record<string, { width: number; height: number }> = {
  team: { width: 220, height: 60 },
  agent: { width: 190, height: 56 },
  bot: { width: 170, height: 56 },
  skill: { width: 160, height: 52 },
  cron: { width: 160, height: 52 },
  advisor: { width: 170, height: 56 },
};

function getLayoutedElements(data: TopologyData) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 70 });

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
      type: "nexus",
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

  const edges: Edge[] = data.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    type: "nexus",
    data: { relation: e.relation, volume: e.volume || 0 },
  }));

  return { nodes, edges };
}

// Legend items
const legendItems: { relation: EdgeRelation; color: string; label: string; dash?: boolean }[] = [
  { relation: "dispatches", color: "#00D4FF", label: "dispatches" },
  { relation: "uses_skill", color: "#4ADE80", label: "uses skill", dash: true },
  { relation: "triggers_cron", color: "#FBBF24", label: "triggers cron", dash: true },
  { relation: "monitors", color: "#C084FC", label: "monitors", dash: true },
  { relation: "feeds", color: "#F472B6", label: "feeds" },
];

const typeFilters: { type: AgentType; label: string; color: string }[] = [
  { type: "team", label: "צוות", color: "#C084FC" },
  { type: "agent", label: "אייג׳נט", color: "#00D4FF" },
  { type: "bot", label: "בוט", color: "#4ADE80" },
  { type: "skill", label: "סקיל", color: "#94A3B8" },
  { type: "cron", label: "קרון", color: "#FBBF24" },
  { type: "advisor", label: "יועץ", color: "#F472B6" },
];

export function NexusTopology({ data }: { data: TopologyData }) {
  const [selectedAgent, setSelectedAgent] = useState<TNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ source: string; target: string; relation: EdgeRelation } | null>(null);
  const [hiddenTypes, setHiddenTypes] = useState<Set<AgentType>>(new Set<AgentType>(["skill", "cron"]));

  const filteredData = useMemo(() => {
    if (hiddenTypes.size === 0) return data;
    const nodeIds = new Set(data.nodes.filter((n) => !hiddenTypes.has(n.type)).map((n) => n.id));
    return {
      nodes: data.nodes.filter((n) => nodeIds.has(n.id)),
      edges: data.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target)),
    };
  }, [data, hiddenTypes]);

  // Toxic path detection: find nodes that are "down" and highlight their edges
  const toxicSlugs = useMemo(() => {
    return new Set(data.nodes.filter((n) => n.status === "down").map((n) => n.id));
  }, [data]);

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    const result = getLayoutedElements(filteredData);
    // Mark edges on toxic paths
    for (const edge of result.edges) {
      const isToxic = toxicSlugs.has(edge.source) || toxicSlugs.has(edge.target);
      edge.data = { ...(edge.data || {}), toxic: isToxic };
    }
    return result;
  }, [filteredData, toxicSlugs]);
  const [nodes, , onNodesChange] = useNodesState(layoutNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutEdges);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedEdge(null);
      const slug = node.id;
      const agent = data.nodes.find((n) => n.id === slug);
      if (agent) setSelectedAgent(agent);
    },
    [data]
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedAgent(null);
      const edgeData = edge.data as { relation?: EdgeRelation };
      setSelectedEdge({
        source: edge.source,
        target: edge.target,
        relation: edgeData?.relation || "dispatches",
      });
    },
    []
  );

  const toggleType = (type: AgentType) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-180px)] rounded-2xl overflow-hidden" style={{ border: "1px solid var(--nexus-border)" }}>
      {/* Filter bar */}
      <div
        className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-md"
        style={{ background: "rgba(13,15,20,0.85)", border: "1px solid var(--nexus-border)" }}
      >
        {typeFilters.map((f) => (
          <button
            key={f.type}
            onClick={() => toggleType(f.type)}
            className="text-[10px] font-semibold px-2 py-1 rounded-md transition-all"
            style={{
              background: hiddenTypes.has(f.type) ? "transparent" : `${f.color}20`,
              color: hiddenTypes.has(f.type) ? "var(--nexus-text-3)" : f.color,
              border: hiddenTypes.has(f.type) ? "1px solid var(--nexus-border)" : `1px solid ${f.color}40`,
              opacity: hiddenTypes.has(f.type) ? 0.4 : 1,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-3 right-3 z-20 flex items-center gap-3 px-3 py-2 rounded-xl backdrop-blur-md"
        style={{ background: "rgba(13,15,20,0.85)", border: "1px solid var(--nexus-border)" }}
      >
        {legendItems.map((item) => (
          <span key={item.relation} className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--nexus-text-2)" }}>
            <span
              className="inline-block w-4 h-0.5"
              style={{
                background: item.dash ? "transparent" : item.color,
                borderTop: item.dash ? `2px dashed ${item.color}` : "none",
              }}
            />
            {item.label}
          </span>
        ))}
      </div>

      {/* Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.05}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: "nexus" }}
      >
        <Background color="rgba(255,255,255,0.03)" gap={24} size={1} />
        <Controls
          position="bottom-left"
          className="!rounded-xl !border-0 [&>button]:!rounded-lg [&>button]:!border-0"
          style={{
            background: "var(--nexus-bg-card)",
            boxShadow: "0 0 20px rgba(0,0,0,0.3)",
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const type = (node.data as { agentType?: string })?.agentType;
            const f = typeFilters.find((t) => t.type === type);
            return f?.color || "#4B5563";
          }}
          maskColor="rgba(0,0,0,0.8)"
          className="!rounded-xl !border-0"
          style={{ background: "var(--nexus-bg-card)" }}
          position="top-left"
        />
      </ReactFlow>

      {/* Detail panel */}
      <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />

      {/* Trace panel (edge click) */}
      <TracePanel edge={selectedEdge} onClose={() => setSelectedEdge(null)} />
    </div>
  );
}
