// src/utils/layout.ts
import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../types';

const nodeWidth = 350;
const nodeHeight = 150;
const HORIZONTAL_GAP = 200; // The horizontal space between separate conversation streams

/**
 * Partitions a graph into its connected components (separate conversation streams).
 * @param nodes - All nodes on the canvas.
 * @param edges - All edges on the canvas.
 * @returns An array of subgraphs, where each subgraph is a connected component.
 */
const partitionGraph = (nodes: Node<NodeData>[], edges: Edge[]): { nodes: Node<NodeData>[], edges: Edge[] }[] => {
  const visited = new Set<string>();
  const components: { nodes: Node<NodeData>[], edges: Edge[] }[] = [];
  const adj = new Map<string, string[]>();

  // Build adjacency list for traversal
  nodes.forEach(node => adj.set(node.id, []));
  edges.forEach(edge => {
    adj.get(edge.source)?.push(edge.target);
    adj.get(edge.target)?.push(edge.source);
  });

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const componentNodes: Node<NodeData>[] = [];
      const q = [node];
      visited.add(node.id);

      // BFS to find all nodes in the current component
      while (q.length > 0) {
        const u = q.shift()!;
        componentNodes.push(u);
        for (const vId of adj.get(u.id) || []) {
          const vNode = nodes.find(n => n.id === vId);
          if (vNode && !visited.has(vId)) {
            visited.add(vId);
            q.push(vNode);
          }
        }
      }

      // Get edges for the current component
      const componentNodeIds = new Set(componentNodes.map(n => n.id));
      const componentEdges = edges.filter(e => componentNodeIds.has(e.source) && componentNodeIds.has(e.target));
      
      components.push({ nodes: componentNodes, edges: componentEdges });
    }
  }
  return components;
};


/**
 * Lays out a SINGLE graph component using Dagre.
 * @param nodes - The nodes of the single component.
 * @param edges - The edges of the single component.
 * @returns The same nodes with updated `position` properties.
 */
const layoutSingleGraph = (nodes: Node<NodeData>[], edges: Edge[]): { layoutedNodes: Node<NodeData>[], width: number, height: number } => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });

  nodes.forEach((node) => {
    const height = node.data.nodeType === 'INPUT' ? 60 : nodeHeight + (node.data.agentResponse?.stages?.length || 0) * 50;
    dagreGraph.setNode(node.id, { width: nodeWidth, height });
  });

  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));

  dagre.layout(dagreGraph);
  
  const graphDimensions = dagreGraph.graph();

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - (dagreGraph.node(node.id).height) / 2,
      }
    };
  });
  
  return { layoutedNodes, width: graphDimensions.width || 0, height: graphDimensions.height || 0 };
};

/**
 * The main exported function. It partitions the graph, layouts each component,
 * and then stitches them together horizontally.
 * @param nodes - All nodes on the canvas.
 * @param edges - All edges on the canvas.
 * @returns A new array of all nodes with non-overlapping positions.
 */
export const getLayoutedElements = (nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData>[] => {
  const components = partitionGraph(nodes, edges);
  const allLayoutedNodes: Node<NodeData>[] = [];
  let offsetX = 0;

  components.forEach(component => {
    if (component.nodes.length === 0) return;

    // 1. Layout each stream individually
    const { layoutedNodes, width } = layoutSingleGraph(component.nodes, component.edges);

    // 2. Apply the horizontal offset to this stream
    const translatedNodes = layoutedNodes.map(node => ({
      ...node,
      position: {
        ...node.position,
        x: node.position.x + offsetX,
      }
    }));

    allLayoutedNodes.push(...translatedNodes);

    // 3. Update the offset for the next stream
    offsetX += width + HORIZONTAL_GAP;
  });

  return allLayoutedNodes;
};