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
import { DbSchema, useContextStore, UserFile } from './store/contextStore';

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

const buildInjectedContext = (
  schema: DbSchema | null, 
  selectedTables: Record<string, boolean>,
  associatedFiles: UserFile[]
): object | null => {
  
  const contextParts: any = {};
  let hasContent = false;

  // 1. Format Schema Context
  if (schema && Object.values(selectedTables).some(v => v)) {
    let markdown = "Schema for selected tables:\n";
    const source_paths: string[] = [];
    for (const tableKey in selectedTables) {
      if (selectedTables[tableKey]) {
        const [dbName, tableName] = tableKey.split('.');
        if (schema[dbName] && schema[dbName][tableName]) {
          source_paths.push(tableKey);
          const columns = schema[dbName][tableName];
          const columnsStr = columns.map(c => `${c.name}: ${c.type}`).join(', ');
          markdown += `- ${tableName}(${columnsStr})\n`;
        }
      }
    }
    if (source_paths.length > 0) {
      contextParts.schemas = { markdown, source_paths };
      hasContent = true;
    }
  }

  // 2. Format File Context
  const associatedFilesInjected = associatedFiles.filter(f => f.isAssociated && f.status === 'ready' && f.content);
  if (associatedFilesInjected.length > 0) {
    contextParts.files = {};
    associatedFilesInjected.forEach(file => {
      contextParts.files[file.name] = {
        type: 'full_content',
        content: file.content
      };
    });
    hasContent = true;
  }

  return hasContent ? contextParts : null;
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
    // Only layout if there are nodes and no active input node.
    // This prevents re-layouting while the user is about to type.
    if (nodes.length > 0 && !nodes.some(n => n.data.nodeType === 'INPUT')) {
      const layoutedNodes = getLayoutedElements(nodes, edges);
      setGraphState(currentGraph => ({ ...currentGraph, nodes: layoutedNodes }));
    }

    // --- Focus Logic ---
    const activeInputNode = nodes.find(n => n.data.nodeType === 'INPUT');
    const targetNode = activeInputNode || nodes[nodes.length - 1];

    if (targetNode) {
      setTimeout(() => {
        reactFlowInstance.fitView({ 
          padding: 0.2, 
          duration: 500, // Slightly faster animation
          nodes: [{id: targetNode.id}] 
        });
      }, 100);
    }
  }, [nodes.length, edges.length, reactFlowInstance]); 

  const handleInputSubmit = useCallback((prompt: string, inputNodeId: string, parentNode: Node<NodeData>) => {
    const responseNodeId = uuidv4();

    const { selectedEnvironment, dbSchema, selectedTables } = useContextStore.getState();

    // The check is now on the object itself.
    if (!parentNode) {
      console.error("Critical Error: parentNode object was not passed to handleInputSubmit.");
      return;
    }

    setGraphState(currentGraph => {
      // Build history with the passed parentNode, using its ID.
      const conversationHistory = buildConversationHistory(parentNode.id, currentGraph.nodes, currentGraph.edges);
      const { userFiles } = useContextStore.getState();
      const injectedContext = buildInjectedContext(dbSchema, selectedTables, userFiles);

      streamAgentResponse(parentNode, prompt, conversationHistory,injectedContext, {
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
    if (parentNode.data.nodeType === 'INPUT') {
      return;
    }

    setGraphState(currentGraph => {
      const existingInputNode = currentGraph.nodes.find(n => n.data.nodeType === 'INPUT');

      if (existingInputNode && currentGraph.edges.some(e => e.source === parentNode.id && e.target === existingInputNode.id)) {
        return {
          nodes: currentGraph.nodes.filter(n => n.id !== existingInputNode.id),
          edges: currentGraph.edges.filter(e => e.target !== existingInputNode.id),
        };
      }

      const nodesWithoutOldInput = existingInputNode 
        ? currentGraph.nodes.filter(n => n.id !== existingInputNode.id) 
        : currentGraph.nodes;
      const edgesWithoutOldInput = existingInputNode 
        ? currentGraph.edges.filter(e => e.target !== existingInputNode.id) 
        : currentGraph.edges;

      const inputNodeId = uuidv4();
      
      // CRITICAL FIX: Calculate the position IMMEDIATELY.
      // We use parentNode's actual rendered position and dimensions.
      const newNodePosition = {
        x: parentNode.position.x,
        y: parentNode.position.y + (parentNode.height || 150) + 20, // Add a small gap
      };

      const inputNode: Node<NodeData> = {
        id: inputNodeId,
        type: 'custom',
        position: newNodePosition, // Use the calculated position
        data: {
          id: inputNodeId,
          label: '',
          nodeType: 'INPUT',
          onSubmit: (prompt, nodeId) => handleInputSubmit(prompt, nodeId, parentNode),
        }
      };

      return {
        nodes: nodesWithoutOldInput.concat(inputNode),
        edges: addEdge({ id: `e-${parentNode.id}-${inputNodeId}`, source: parentNode.id, target: inputNodeId }, edgesWithoutOldInput),
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

    const { selectedEnvironment, dbSchema, selectedTables, userFiles } = useContextStore.getState();
    const injectedContext = buildInjectedContext(dbSchema, selectedTables, userFiles);
    // --- THIS IS THE FULL, CORRECT CALLBACK LOGIC ---
    streamAgentResponse(dummyParent, userPrompt, conversationHistory,injectedContext, {
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