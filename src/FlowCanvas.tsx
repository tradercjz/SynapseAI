// src/FlowCanvas.tsx
import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, {
  Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge,
  Node, Edge, NodeChange, EdgeChange, Connection,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import { NodeData } from './types';
import { AgentUpdate, LlmChunk } from './agent';
import CustomNode from './CustomNode';
import OmniBar from './OmniBar';
import { streamAgentResponse } from './agentService';
import AttachedInput from './components/AttachedInput';
import { Message } from './agent';

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
      history.unshift({ id: Date.now(), sender: 'ai', content: node.data.agentResponse });
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

  const updateNodeData = (nodeId: string, dataUpdater: (prevData: NodeData) => NodeData) => {
    setNodes(nds => nds.map(node => {
      if (node.id === nodeId) {
        return { ...node, data: dataUpdater(node.data) };
      }
      return node;
    }));
  };
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setActiveInputNodeId(node.id);
  }, []);

    const onPaneClick = useCallback(() => {
      setActiveInputNodeId(null);
    }, []);

  // --- 核心修改在这里 ---
 

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

   const handleCreateNode = useCallback((userPrompt: string) => {
    const userNodeId = uuidv4();
    const userNode: Node<NodeData> = {
      id: userNodeId,
      type: 'custom',
      position: { x: window.innerWidth / 2 - 350, y: 100 + nodes.length * 20 },
      data: { id: userNodeId, label: userPrompt, onAgentClick: () => {} },
    };
    
    // Atomically add the user node to the state
    setNodes(nds => nds.concat(userNode));

    // **CRITICAL FIX**: Pass the newly created `userNode` OBJECT directly to the handler.
    // This bypasses the state update delay.
    handleFollowUpSubmit(userPrompt, userNode);

  }, [nodes, handleFollowUpSubmit]); 

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