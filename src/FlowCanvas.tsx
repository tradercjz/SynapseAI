// src/FlowCanvas.tsx
import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge,
  Node, Edge, NodeChange, EdgeChange, Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { NodeData } from './types';
import { AgentUpdate, LlmChunk } from './agent';
import CustomNode from './CustomNode';
import OmniBar from './OmniBar';
import { streamAgentResponse } from './agentService';

const initialNodes: Node<NodeData>[] = [];

export default function FlowCanvas() {
  const [nodes, setNodes] = useState<Node<NodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), []);

  const updateNodeData = (nodeId: string, dataUpdater: (prevData: NodeData) => NodeData) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: dataUpdater(node.data) };
      }
      return node;
    }));
  };
  
  const handleAgentClick = useCallback(async (sourceNodeId: string) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    const userPrompt = window.prompt("Ask the agent a follow-up question:", "Explain this in more detail");
    if (!userPrompt) return;

    const responseNodeId = uuidv4();
    const responseNode: Node<NodeData> = {
      id: responseNodeId,
      type: 'custom',
      position: { x: sourceNode.position.x, y: sourceNode.position.y + (sourceNode.height || 100) + 80 },
      data: {
        id: responseNodeId,
        label: `Agent Response to: "${userPrompt.substring(0, 30)}..."`,
        isLoading: true,
        agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
        onAgentClick: handleAgentClick,
      }
    };
    
    setNodes(nds => nds.concat(responseNode));
    setEdges(eds => addEdge({ id: `e-${sourceNodeId}-${responseNodeId}`, source: sourceNodeId, target: responseNodeId, animated: true }, eds));
    
    streamAgentResponse(sourceNode, userPrompt, {
      onUpdate: (update: AgentUpdate) => {
        updateNodeData(responseNodeId, (prevData) => {
          const currentResponse = prevData.agentResponse!;
          let newStages = [...currentResponse.stages];
          let newThinkingStream = currentResponse.thinkingStream || '';

          if (update.subtype === 'llm_chunk') {
            newThinkingStream += (update as LlmChunk).content;
          } else {
            newThinkingStream = '';
            newStages.push(update);
          }
          
          return {
            ...prevData,
            agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream }
          };
        });
      },
      onClose: () => {
        updateNodeData(responseNodeId, d => ({ ...d, isLoading: false }));
      },
      onError: (error) => {
        console.error("Streaming Error:", error);
        updateNodeData(responseNodeId, d => ({ 
          ...d, 
          isLoading: false,
          label: `Error: ${d.label}` 
        }));
      }
    });
  }, [nodes]); 

  // --- 核心修改在这里 ---
  const handleCreateNode = useCallback((userPrompt: string) => {
    // 1. 创建用户的原始输入节点 (User Node)
    const userNodeId = uuidv4();
    const userNode: Node<NodeData> = {
      id: userNodeId,
      type: 'custom',
      position: { 
        x: window.innerWidth / 2 - 300, 
        y: 100 + nodes.filter(n => n.position.y < 400).length * 50 // 简单布局
      },
      data: { id: userNodeId, label: userPrompt, onAgentClick: handleAgentClick },
    };

    // 2. 立即创建AI响应节点 (AI Node)
    const responseNodeId = uuidv4();
    const responseNode: Node<NodeData> = {
      id: responseNodeId,
      type: 'custom',
      position: { x: userNode.position.x + 400, y: userNode.position.y },
      data: {
        id: responseNodeId,
        label: `Agent Analysis for: "${userPrompt.substring(0, 30)}..."`,
        isLoading: true, // 立即进入加载状态
        agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
        onAgentClick: handleAgentClick,
      }
    };

    // 3. 将两个新节点和一个连接线原子化地添加到状态中
    setNodes(nds => nds.concat([userNode, responseNode]));
    setEdges(eds => addEdge({ id: `e-${userNodeId}-${responseNodeId}`, source: userNodeId, target: responseNodeId, animated: true }, eds));

    // 4. 直接使用用户的输入触发API调用
    streamAgentResponse(userNode, userPrompt, {
      onUpdate: (update: AgentUpdate) => {
        updateNodeData(responseNodeId, (prevData) => {
          const currentResponse = prevData.agentResponse!;
          let newStages = [...currentResponse.stages];
          let newThinkingStream = currentResponse.thinkingStream || '';

          if (update.subtype === 'llm_chunk') {
            newThinkingStream += (update as LlmChunk).content;
          } else {
            newThinkingStream = '';
            newStages.push(update);
          }
          
          return {
            ...prevData,
            agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream }
          };
        });
      },
      onClose: () => {
        updateNodeData(responseNodeId, d => ({ ...d, isLoading: false }));
      },
      onError: (error) => {
        console.error("Streaming Error:", error);
        updateNodeData(responseNodeId, d => ({ 
          ...d, 
          isLoading: false,
          label: `Error: ${d.label}` 
        }));
      }
    });
  }, [nodes, handleAgentClick]); // 依赖项现在也需要 nodes 用于布局计算

  const nodesWithUpdatedHandler = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: { ...node.data, onAgentClick: handleAgentClick }
    }));
  }, [nodes, handleAgentClick]);

  return (
    <div className="flow-canvas">
      <OmniBar onCreateNode={handleCreateNode} />
      <ReactFlow
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