// src/FlowCanvas.tsx
import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { NodeData } from './types';
import CustomNode from './CustomNode';
import OmniBar from './OmniBar';
import { mockAIResponseAPI } from './api';

const initialNodes: Node<NodeData>[] = [];

export default function FlowCanvas() {
  const [nodes, setNodes] = useState<Node<NodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );
  
  const handleAgentClick = useCallback(async (sourceNodeId: string) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    const userPrompt = window.prompt("What would you like to ask the agent?", "Break this down further");

    if (userPrompt === null || userPrompt.trim() === "") {
      return;
    }

    const { newNode, newConnector } = await mockAIResponseAPI(sourceNode, userPrompt);
    
    const positionedNewNode = {
        ...newNode,
        position: {
            x: sourceNode.position.x,
            y: sourceNode.position.y + (sourceNode.height || 100) + 50,
        },
    };

    setNodes((nds) => nds.concat(positionedNewNode));
    setEdges((eds) => eds.concat(newConnector));

  }, [nodes]); 

  const handleCreateNode = useCallback((label: string) => {
    const id = uuidv4();
    const newNode: Node<NodeData> = {
      id,
      type: 'custom',
      position: {
        x: window.innerWidth / 2 - 150 + (Math.random() - 0.5) * 200,
        y: 100 + (Math.random() - 0.5) * 50,
      },
      // --- FIX: The handler passed here is correct for THIS node at THIS time ---
      data: { id, label, onAgentClick: handleAgentClick },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [handleAgentClick]);

  // --- FIX: THIS IS THE CRITICAL CHANGE ---
  // We use useMemo to create a new array of nodes for rendering.
  // This ensures that EVERY node in the array has the LATEST version of the `handleAgentClick` function.
  const nodesWithUpdatedHandler = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onAgentClick: handleAgentClick,
      }
    }));
  }, [nodes, handleAgentClick]);


  return (
    <div className="flow-canvas">
      <OmniBar onCreateNode={handleCreateNode} />
      <ReactFlow
        // --- FIX: Use the derived array with the updated handlers ---
        nodes={nodesWithUpdatedHandler}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}