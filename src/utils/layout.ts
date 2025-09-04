// src/utils/layout.ts
import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../types';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 350;
const nodeHeight = 150;

export const getLayoutedElements = (nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData>[] => {
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });

  // --- SIMPLIFIED: No more filtering! ---
  nodes.forEach((node) => {
    // Input nodes are now included in the layout. We can give them a smaller height.
    const height = node.data.nodeType === 'INPUT' ? 60 : nodeHeight + (node.data.agentResponse?.stages?.length || 0) * 50;
    dagreGraph.setNode(node.id, { width: nodeWidth, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - (dagreGraph.node(node.id).height) / 2,
    };
    return node;
  });
};