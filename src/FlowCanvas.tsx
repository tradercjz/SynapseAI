// src/FlowCanvas.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge,
  Node, Edge, NodeChange, EdgeChange, Connection,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { NodeData } from './types';
import { AgentUpdate, LlmChunk, Message, TaskEnd } from './agent';
import CustomNode from './CustomNode';
import OmniBar from './OmniBar';
import { streamAgentResponse } from './agentService';
import { getLayoutedElements } from './utils/layout'; 

const buildConversationHistory = (targetNodeId: string, nodes: Node<NodeData>[], edges: Edge[]): Message[] => {
    const history: Message[] = [];
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const edgeMap = new Map(edges.map(e => [e.target, e.source]));
    let currentNodeId: string | undefined = targetNodeId;
    while (currentNodeId) {
        const node = nodeMap.get(currentNodeId);
        if (!node) break;
        if (node.data.nodeType === 'AI_RESPONSE') {
            history.unshift({ id: Date.now(), sender: 'assistant', content: node.data.agentResponse! });
        } else if (node.data.nodeType === 'USER_QUERY') {
            history.unshift({ id: Date.now(), sender: 'user', content: node.data.label });
        }
        currentNodeId = edgeMap.get(currentNodeId);
    }
    return history;
};

export default function FlowCanvas() {
  const [graphState, setGraphState] = useState<{ nodes: Node<NodeData>[], edges: Edge[] }>({ nodes: [], edges: [] });
  const { nodes, edges } = graphState;
  const reactFlowInstance = useReactFlow();
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const onNodesChange = useCallback((changes: NodeChange[]) => setGraphState(g => ({ ...g, nodes: applyNodeChanges(changes, g.nodes) })), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setGraphState(g => ({ ...g, edges: applyEdgeChanges(changes, g.edges) })), []);
  const onConnect = useCallback((connection: Connection) => setGraphState(g => ({ ...g, edges: addEdge(connection, g.edges) })), []);

  useEffect(() => {
    if (nodes.length > 0) {
      const layoutedNodes = getLayoutedElements(nodes, edges);
      setGraphState(currentGraph => ({ ...currentGraph, nodes: layoutedNodes }));
      
      setTimeout(() => {
        const lastNode = nodes[nodes.length - 1];
        if (lastNode) {
          reactFlowInstance.fitView({ padding: 0.2, duration: 800, nodes: [{id: lastNode.id}] });
        }
      }, 150);
    }
  }, [nodes.length, edges.length, reactFlowInstance]);

  const handleInputSubmit = useCallback((prompt: string, inputNodeId: string, parentNode: Node<NodeData>) => {
    const responseNodeId = uuidv4();

    // The check is now on the object itself.
    if (!parentNode) {
      console.error("Critical Error: parentNode object was not passed to handleInputSubmit.");
      return;
    }

    setGraphState(currentGraph => {
      // Build history with the passed parentNode, using its ID.
      const conversationHistory = buildConversationHistory(parentNode.id, currentGraph.nodes, currentGraph.edges);
      
      streamAgentResponse(parentNode, prompt, conversationHistory, {
        // --- THIS IS THE FULL, CORRECT CALLBACK LOGIC ---
        onUpdate: (update) => {
          setGraphState(g => ({
            ...g,
            nodes: g.nodes.map(n => {
              if (n.id === responseNodeId) {
                const currentResponse = n.data.agentResponse!;
                let newStages = [...currentResponse.stages];
                let newThinkingStream = currentResponse.thinkingStream || '';
                if (update.subtype === 'llm_chunk') {
                  newThinkingStream += (update as LlmChunk).content;
                } else {
                  newThinkingStream = '';
                  newStages.push(update);
                }
                return {
                  ...n,
                  data: {
                    ...n.data,
                    agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream }
                  }
                };
              }
              return n;
            })
          }));
        },
        onClose: () => {
          setGraphState(g => ({
            ...g,
            nodes: g.nodes.map(n => {
              if (n.id === responseNodeId) {
                const stages = n.data.agentResponse?.stages || [];
                const lastStage = stages[stages.length - 1];
                let finalStatus: 'success' | 'error' = 'success';
                if (lastStage && lastStage.subtype === 'end') {
                  finalStatus = (lastStage as TaskEnd).success ? 'success' : 'error';
                } else if (lastStage && lastStage.type === 'error') {
                  finalStatus = 'error';
                }
                return { ...n, data: { ...n.data, isLoading: false, taskStatus: finalStatus } };
              }
              return n;
            })
          }));
        },
        onError: (error) => {
          console.error("Streaming Error:", error);
          setGraphState(g => ({
            ...g,
            nodes: g.nodes.map(n => {
              if (n.id === responseNodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    isLoading: false,
                    taskStatus: 'error',
                    label: `Error: ${n.data.label}`
                  }
                };
              }
              return n;
            })
          }));
        }
      });

      const solidifiedNodes = currentGraph.nodes.map(n => 
        n.id === inputNodeId 
          ? { ...n, data: { ...n.data, label: prompt, nodeType: 'USER_QUERY' as const } } 
          : n
      );
      const responseNode: Node<NodeData> = {
        id: responseNodeId, type: 'custom', position: { x: 0, y: 0 },
        data: {
          id: responseNodeId, label: `Agent: ${prompt.substring(0, 40)}...`,
          nodeType: 'AI_RESPONSE', isLoading: true,
          agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
        }
      };
      
     return {
        nodes: solidifiedNodes.concat(responseNode),
        edges: addEdge({ id: `e-${inputNodeId}-${responseNodeId}`, source: inputNodeId, target: responseNodeId, animated: true }, currentGraph.edges),
      };
    });
  }, []);

  const onNodeClick = useCallback((event: React.MouseEvent, parentNode: Node<NodeData>) => {
    setGraphState(currentGraph => {
      if (currentGraph.nodes.some(n => n.data.nodeType === 'INPUT')) {
        return currentGraph;
      }
      const inputNodeId = uuidv4();
      const inputNode: Node<NodeData> = {
        id: inputNodeId, type: 'custom', position: { x: 0, y: 0 },
        data: {
          id: inputNodeId, label: '', nodeType: 'INPUT',
          onSubmit: (prompt, nodeId) => handleInputSubmit(prompt, nodeId, parentNode),
        }
      };
      return {
        nodes: currentGraph.nodes.concat(inputNode),
        edges: addEdge({ id: `e-${parentNode.id}-${inputNodeId}`, source: parentNode.id, target: inputNodeId }, currentGraph.edges),
      };
    });
  }, [handleInputSubmit]);

  const handleCreateNode = useCallback((userPrompt: string) => {
    const dummyParent: Node<NodeData> = { id: 'root', data: {id: 'root', label: '', nodeType: 'USER_QUERY'}, position: {x:0, y:0}, type: 'custom' };
    const conversationHistory: Message[] = [];
    const responseNodeId = uuidv4();
    const userNodeId = uuidv4();
    
    const userNode: Node<NodeData> = {
        id: userNodeId, type: 'custom', position: { x: 0, y: 0 },
        data: { id: userNodeId, label: userPrompt, nodeType: 'USER_QUERY' },
    };
    const responseNode: Node<NodeData> = {
      id: responseNodeId, type: 'custom', position: { x: 0, y: 0 },
      data: {
        id: responseNodeId, label: `Agent: ${userPrompt.substring(0, 40)}...`,
        nodeType: 'AI_RESPONSE', isLoading: true,
        agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
      }
    };
    
    setGraphState(currentGraph => ({
      nodes: currentGraph.nodes.concat([userNode, responseNode]),
      edges: addEdge({ id: `e-${userNode.id}-${responseNode.id}`, source: userNode.id, target: responseNode.id, animated: true }, currentGraph.edges),
    }));

    // --- THIS IS THE FULL, CORRECT CALLBACK LOGIC ---
    streamAgentResponse(dummyParent, userPrompt, conversationHistory, {
      onUpdate: (update) => {
        setGraphState(g => ({
          ...g,
          nodes: g.nodes.map(n => {
            if (n.id === responseNodeId) {
              const currentResponse = n.data.agentResponse!;
              let newStages = [...currentResponse.stages];
              let newThinkingStream = currentResponse.thinkingStream || '';
              if (update.subtype === 'llm_chunk') {
                newThinkingStream += (update as LlmChunk).content;
              } else {
                newThinkingStream = '';
                newStages.push(update);
              }
              return {
                ...n,
                data: {
                  ...n.data,
                  agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream }
                }
              };
            }
            return n;
          })
        }));
      },
      onClose: () => {
        setGraphState(g => ({
          ...g,
          nodes: g.nodes.map(n => {
            if (n.id === responseNodeId) {
              const stages = n.data.agentResponse?.stages || [];
              const lastStage = stages[stages.length - 1];
              let finalStatus: 'success' | 'error' = 'success';
              if (lastStage && lastStage.subtype === 'end') {
                finalStatus = (lastStage as TaskEnd).success ? 'success' : 'error';
              } else if (lastStage && lastStage.type === 'error') {
                finalStatus = 'error';
              }
              return { ...n, data: { ...n.data, isLoading: false, taskStatus: finalStatus } };
            }
            return n;
          })
        }));
      },
      onError: (error) => {
        console.error("Streaming Error:", error);
        setGraphState(g => ({
          ...g,
          nodes: g.nodes.map(n => {
            if (n.id === responseNodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  isLoading: false,
                  taskStatus: 'error',
                  label: `Error: ${n.data.label}`
                }
              };
            }
            return n;
          })
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