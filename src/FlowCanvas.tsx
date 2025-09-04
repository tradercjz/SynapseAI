// src/FlowCanvas.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge,
  Node, Edge, NodeChange, EdgeChange, Connection,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { NodeData, NodeType } from './types';
import { AgentUpdate, LlmChunk } from './agent';
import CustomNode from './CustomNode';
import OmniBar from './OmniBar';
import { streamAgentResponse } from './agentService';
import AttachedInput from './components/AttachedInput';
import InputNode from './components/InputNode';
import { Message, TaskEnd } from './agent';
import { getLayoutedElements } from './utils/layout'; 

const initialNodes: Node<NodeData>[] = [];

const buildConversationHistory = (targetNodeId: string, nodes: Node<NodeData>[], edges: Edge[]): Message[] => {
  const history: Message[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const edgeMap = new Map(edges.map(e => [e.target, e.source]));

  let currentNodeId: string | undefined = targetNodeId;

  while (currentNodeId) {
    const node = nodeMap.get(currentNodeId);
    if (!node) break;

    // 根据节点内容构建 Message 对象
    if (node.data.agentResponse) { // This is an AI response node
      history.unshift({ id: Date.now(), sender: 'assistant', content: node.data.agentResponse });
    } else { // This is a user-initiated node
      history.unshift({ id: Date.now(), sender: 'user', content: node.data.label });
    }
    
    // 移动到父节点
    currentNodeId = edgeMap.get(currentNodeId);
  }

  return history;
};

export default function FlowCanvas() {
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const reactFlowInstance = useReactFlow();

  // Unified node model uses only 'custom'
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), []);

  useEffect(() => {
    if (nodes.length > 0) {
      const layoutedNodes = getLayoutedElements(nodes, edges);
      setNodes(layoutedNodes);
      
      setTimeout(() => {
        const lastNode = nodes.reduce((prev, current) => ((prev.position.y > current.position.y) ? prev : current), nodes[0]);
        if (lastNode) {
          reactFlowInstance.fitView({ padding: 0.2, duration: 800, nodes: [{id: lastNode.id}] });
        }
      }, 150);
    }
  }, [nodes.length, edges.length, reactFlowInstance]);

  const onNodeClick = useCallback((event: React.MouseEvent, parentNode: Node<NodeData>) => {
      if (nodes.some(n => n.data.nodeType === 'INPUT')) return;

      const inputNodeId = uuidv4();
      const inputNode: Node<NodeData> = {
        id: inputNodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          id: inputNodeId,
          label: '',
          nodeType: 'INPUT',
          onSubmit: (prompt, nodeId) => handleInputSubmit(prompt, nodeId, parentNode.id),
        }
      };
      setNodes(nds => nds.concat(inputNode));
      setEdges(eds => addEdge({ id: `e-${parentNode.id}-${inputNodeId}`, source: parentNode.id, target: inputNodeId }, eds));
    }, [nodes]);

  const handleInputSubmit = (prompt: string, inputNodeId: string, parentNodeId: string) => {
    const parentNode = nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return;
    
    const conversationHistory = buildConversationHistory(parentNodeId, nodes, edges);
    
    const responseNodeId = uuidv4();
    const responseNode: Node<NodeData> = {
      id: responseNodeId,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        id: responseNodeId,
        label: `Agent: ${prompt.substring(0, 40)}...`,
        nodeType: 'AI_RESPONSE',
        isLoading: true,
        agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
      }
    };
    
    // Atomically update nodes (solidify input + add response) and edges
    setNodes(nds => {
      const solidifiedNodes = nds.map(n => 
        n.id === inputNodeId 
          ? { ...n, data: { ...n.data, label: prompt, nodeType: 'USER_QUERY' } } 
          : n
      );
      return solidifiedNodes.concat(responseNode);
    });
    setEdges(eds => addEdge({ id: `e-${inputNodeId}-${responseNodeId}`, source: inputNodeId, target: responseNodeId, animated: true }, eds));
    
    streamAgentResponse(parentNode, prompt, conversationHistory, {
      onUpdate: (update: AgentUpdate) => {
        setNodes(nds => nds.map(n => {
            if (n.id === responseNodeId) {
                const currentResponse = n.data.agentResponse!;
                let newStages = [...currentResponse.stages];
                let newThinkingStream = currentResponse.thinkingStream || '';
                if (update.subtype === 'llm_chunk') newThinkingStream += (update as LlmChunk).content;
                else { newThinkingStream = ''; newStages.push(update); }
                return { ...n, data: { ...n.data, agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream }}};
            }
            return n;
        }));
      },
      // --- REWRITTEN: onClose handler with status logic ---
      onClose: () => {
        setNodes(nds => nds.map(n => {
            if (n.id === responseNodeId) {
              const stages = n.data.agentResponse?.stages || [];
              const lastStage = stages[stages.length - 1];
              let finalStatus: 'success' | 'error' = 'success';
              if (lastStage && lastStage.subtype === 'end') {
                  finalStatus = (lastStage as TaskEnd).success ? 'success' : 'error';
              } else if (lastStage && lastStage.type === 'error') {
                  finalStatus = 'error';
              }
              return { ...n, data: { ...n.data, isLoading: false, taskStatus: finalStatus }};
            }
            return n;
        }));
      },
      // --- REWRITTEN: onError handler with status logic ---
      onError: (error) => {
          console.error("Streaming Error:", error);
          setNodes(nds => nds.map(n => {
            if (n.id === responseNodeId) {
              return { ...n, data: { ...n.data, isLoading: false, taskStatus: 'error', label: `Error: ${n.data.label}` }};
            }
            return n;
          }));
      }
    });
  };

  const handleCreateNode = useCallback((userPrompt: string) => {
    const dummyParent: Node<NodeData> = { id: 'root', data: {id: 'root', label: '', nodeType: 'USER_QUERY'}, position: {x:0, y:0}, type: 'custom' };
    const conversationHistory: Message[] = [];
    const responseNodeId = uuidv4();
    const userNodeId = uuidv4();
    
    const userNode: Node<NodeData> = {
        id: userNodeId,
        type: 'custom',
        position: { x: 0, y: 0 }, // Position determined by layout
        data: { id: userNodeId, label: userPrompt, nodeType: 'USER_QUERY' },
    };
    const responseNode: Node<NodeData> = {
      id: responseNodeId,
      type: 'custom',
      position: { x: 0, y: 0 }, // Position determined by layout
      data: {
        id: responseNodeId,
        label: `Agent: ${userPrompt.substring(0, 40)}...`,
        nodeType: 'AI_RESPONSE',
        isLoading: true,
        agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
      }
    };
    
    setNodes(nds => nds.concat([userNode, responseNode]));
    setEdges(eds => addEdge({ id: `e-${userNode.id}-${responseNode.id}`, source: userNode.id, target: responseNode.id, animated: true }, eds));

    streamAgentResponse(dummyParent, userPrompt, conversationHistory, {
        onUpdate: (update) => {
            setNodes(nds => nds.map(n => {
                if (n.id === responseNodeId) {
                    const currentResponse = n.data.agentResponse!;
                    let newStages = [...currentResponse.stages];
                    let newThinkingStream = currentResponse.thinkingStream || '';
                    if (update.subtype === 'llm_chunk') newThinkingStream += (update as LlmChunk).content;
                    else { newThinkingStream = ''; newStages.push(update); }
                    return { ...n, data: { ...n.data, agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream }}};
                }
                return n;
            }));
        },
        // --- REWRITTEN: onClose handler with status logic ---
        onClose: () => {
            setNodes(nds => nds.map(n => {
                if (n.id === responseNodeId) {
                  const stages = n.data.agentResponse?.stages || [];
                  const lastStage = stages[stages.length - 1];
                  let finalStatus: 'success' | 'error' = 'success';
                  if (lastStage && lastStage.subtype === 'end') {
                      finalStatus = (lastStage as TaskEnd).success ? 'success' : 'error';
                  }
                  return { ...n, data: { ...n.data, isLoading: false, taskStatus: finalStatus }};
                }
                return n;
            }));
        },
        // --- REWRITTEN: onError handler with status logic ---
        onError: (error) => {
            console.error("Streaming Error:", error);
            setNodes(nds => nds.map(n => {
              if (n.id === responseNodeId) {
                return { ...n, data: { ...n.data, isLoading: false, taskStatus: 'error', label: `Error: ${n.data.label}` }};
              }
              return n;
            }));
        }
    });

  }, []);

  return (
    <div className="flow-canvas" style={{width: '100%', height: '100%'}}>
      <OmniBar onCreateNode={handleCreateNode} />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}