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
import { Message } from './agent';
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
  const [nodes, setNodes] = useState<Node<NodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [activeInputNodeId, setActiveInputNodeId] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow(); // 获取 React Flow 实例

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const onNodesChange = useCallback((changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge(connection, eds)), []);

  useEffect(() => {
    if (nodes.length > 0) {
      const layoutedNodes = getLayoutedElements(nodes, edges);
      setNodes(layoutedNodes);
      
      setTimeout(() => {
        // Focus logic: find the node with the highest Y value (the latest one)
        const lastNode = nodes.reduce((prev, current) => (prev.position.y > current.position.y) ? prev : current, nodes[0]);
        
        if (lastNode) {
          reactFlowInstance.fitView({ 
            padding: 0.2, 
            duration: 800, 
            nodes: [{id: lastNode.id}] 
          });
        }
      }, 150); // Increased timeout slightly for smoother rendering
    }
  }, [nodes.length, edges.length, reactFlowInstance]);

  const updateNodeData = (nodeId: string, dataUpdater: (prevData: NodeData) => NodeData) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: dataUpdater(node.data) };
      }
      return node;
    }));
  };
  
   const onNodeClick = useCallback((event: React.MouseEvent, parentNode: Node<NodeData>) => {
      if (nodes.some(n => n.data.nodeType === 'INPUT')) return;

      const inputNodeId = uuidv4();
      const inputNode: Node<NodeData> = {
        id: inputNodeId,
        type: 'custom', // It's a standard node from the start
        position: { x: 0, y: 0 }, // Position will be handled by Dagre
        data: {
          id: inputNodeId,
          label: '',
          nodeType: 'INPUT', // The type in data determines its appearance
          onSubmit: (prompt, nodeId) => handleInputSubmit(prompt, nodeId, parentNode.id),
        }
      };

      setNodes(nds => nds.concat(inputNode));
      setEdges(eds => addEdge({ id: `e-${parentNode.id}-${inputNodeId}`, source: parentNode.id, target: inputNodeId }, eds));
    }, [nodes]);

    const onPaneClick = useCallback(() => {
      setActiveInputNodeId(null);
    }, []);

  // --- 核心修改在这里 ---
 
  const handleInputSubmit = (prompt: string, inputNodeId: string, parentNodeId: string) => {
    // 1. Solidify the Input Node
    setNodes(nds => nds.map(n => 
      n.id === inputNodeId 
        ? { ...n, data: { ...n.data, label: prompt, nodeType: 'USER_QUERY' } } 
        : n
    ));

    // 2. Create AI Response
    const parentNode = nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return;

    const conversationHistory = buildConversationHistory(parentNodeId, nodes, edges);
    
    const responseNodeId = uuidv4();
    const responseNode: Node<NodeData> = {
      id: responseNodeId,
      type: 'custom',
      position: { x: 0, y: 0 }, // Position will be determined by layout
      data: {
        id: responseNodeId,
        label: `Agent: ${prompt.substring(0, 40)}...`,
        nodeType: 'AI_RESPONSE',
        isLoading: true,
        agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
      }
    };
    
    setNodes(nds => nds.concat(responseNode));
    setEdges(eds => addEdge({ id: `e-${inputNodeId}-${responseNodeId}`, source: inputNodeId, target: responseNodeId, animated: true }, eds));
    
    streamAgentResponse(parentNode, prompt, conversationHistory, {
      onUpdate: (update: AgentUpdate) => {
        updateNodeData(responseNodeId, (prevData) => {
          const currentResponse = prevData.agentResponse!;
          let newStages = [...currentResponse.stages];
          let newThinkingStream = currentResponse.thinkingStream || '';
          if (update.subtype === 'llm_chunk') {
            newThinkingStream += (update as LlmChunk).content;
          } else {
            newThinkingStream = '';
            // Only push if update is a valid AgentStage (e.g., subtype is not 'llm_chunk')
            if (update.subtype !== 'llm_chunk') {
              newStages.push(update as any); // If you have a type guard, use it here instead of 'as any'
            }
          }
          return { ...prevData, agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream } };
        });
      },
      onClose: () => updateNodeData(responseNodeId, d => ({ ...d, isLoading: false })),
      onError: (error) => {
          console.error("Streaming Error:", error);
          updateNodeData(responseNodeId, d => ({ ...d, isLoading: false, label: `Error: ${d.label}` }));
      }
    });
    };

  // `handleCreateNode` for OmniBar is now much simpler
  const handleCreateNode = useCallback((userPrompt: string) => {
    // 1. Immediately trigger the AI request, treating the prompt as the first question.
    // We create a "dummy" parent node just for the API call signature.
    const dummyParent: Node<NodeData> = { id: 'root', data: {id: 'root', label: '', nodeType: 'USER_QUERY'}, position: {x:0, y:0}, type: 'custom' };
    
    const conversationHistory: Message[] = []; // History is empty for the first turn

    const responseNodeId = uuidv4();
    const userNodeId = uuidv4();
    
    // 2. Create BOTH the user's initial node and the AI's response node at the same time.
    const userNode: Node<NodeData> = {
        id: userNodeId,
        type: 'custom',
        position: { x: window.innerWidth / 2 - 350, y: 100 },
        data: { id: userNodeId, label: userPrompt, nodeType: 'USER_QUERY' },
    };
    
    const responseNode: Node<NodeData> = {
      id: responseNodeId,
      type: 'custom',
      position: { x: userNode.position.x + 400, y: userNode.position.y },
      data: {
        id: responseNodeId,
        label: `Agent: ${userPrompt.substring(0, 40)}...`,
        nodeType: 'AI_RESPONSE',
        isLoading: true,
        agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
      }
    };
    
    // 3. Atomically add both nodes and the edge between them.
    setNodes(nds => nds.concat([userNode, responseNode]));
    setEdges(eds => addEdge({ id: `e-${userNode.id}-${responseNode.id}`, source: userNode.id, target: responseNode.id, animated: true }, eds));

    // 4. Call the stream function
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
        onClose: () => {
            setNodes(nds => nds.map(n => {
                if (n.id === responseNodeId) return { ...n, data: { ...n.data, isLoading: false }};
                return n;
            }));
        },
        onError: (error) => {
            // ... handle error
        }
    });

  }, []); 

  const handleFollowUpSubmit = useCallback((prompt: string, parentNode: Node<NodeData> | null) => {
    const isRoot = parentNode === null;
    
    // For root calls (from OmniBar), the parent is a newly created user node.
    // For follow-ups, the parent is the node that was clicked.
    const parentNodeId = parentNode ? parentNode.id : null;

    const conversationHistory = parentNodeId ? buildConversationHistory(parentNodeId, nodes, edges) : [];

    const responseNodeId = uuidv4();
    
    let position = { x: window.innerWidth / 2, y: 150 };
    if (parentNode) {
        position = { x: parentNode.position.x + 400, y: parentNode.position.y };
        if (!isRoot) { // For follow-ups, place it below
           position.x = parentNode.position.x;
           position.y = parentNode.position.y + (parentNode.height || 100) + 80;
        }
    }

    const responseNode: Node<NodeData> = {
      id: responseNodeId,
      type: 'custom',
      position,
      data: {
        id: responseNodeId,
        label: `Agent: ${prompt.substring(0, 40)}...`,
        isLoading: true,
        agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
        onAgentClick: () => {},
      }
    };
    
    setNodes(nds => nds.concat(responseNode));
    if (parentNodeId) {
        setEdges(eds => addEdge({ id: `e-${parentNodeId}-${responseNodeId}`, source: parentNodeId, target: responseNodeId, animated: true }, eds));
    }
    
    const apiSourceNode: Node<NodeData> = parentNode || {
      id: 'root',
      type: 'custom',
      position: { x: 0, y: 0 },
      data: {
        id: 'root',
        label: 'Root',
        onAgentClick: () => {}
      }
    };

    streamAgentResponse(apiSourceNode, prompt, conversationHistory, {
      onUpdate: (update: AgentUpdate) => {
        updateNodeData(responseNodeId, (prevData) => {
          const currentResponse = prevData.agentResponse!;
          let newStages = [...currentResponse.stages];
          let newThinkingStream = currentResponse.thinkingStream || '';
          if (update.subtype === 'llm_chunk') {
            newThinkingStream += (update as LlmChunk).content;
          } else {
            newThinkingStream = '';
            // Only push if update is a valid AgentStage (e.g., subtype is not 'llm_chunk')
            if (update.subtype !== 'llm_chunk') {
              newStages.push(update as any); // If you have a type guard, use it here instead of 'as any'
            }
          }
          return { ...prevData, agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream } };
        });
      },
      onClose: () => updateNodeData(responseNodeId, d => ({ ...d, isLoading: false })),
      onError: (error) => {
          console.error("Streaming Error:", error);
          updateNodeData(responseNodeId, d => ({ ...d, isLoading: false, label: `Error: ${d.label}` }));
      }
    });
  }, [nodes, edges]);

   

   const handleAttachedInputSubmit = useCallback((prompt: string, parentNodeId: string) => {
      const parentNode = nodes.find(n => n.id === parentNodeId);
      if(parentNode) {
          handleFollowUpSubmit(prompt, parentNode);
      }
  }, [nodes, handleFollowUpSubmit]);

  const activeNode = useMemo(() => nodes.find(n => n.id === activeInputNodeId) || null, [nodes, activeInputNodeId]);


  return (
    <div className="flow-canvas">
      <OmniBar onCreateNode={handleCreateNode} />
      <AttachedInput 
        activeNode={activeNode}
        // Use the dedicated handler for the attached input
        onSubmit={handleAttachedInputSubmit} 
        onClose={() => setActiveInputNodeId(null)}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick} // Clicking the background closes the input
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="flow-canvas" 
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}