// src/FlowCanvas.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls, Background, applyNodeChanges, applyEdgeChanges, addEdge,
  Node, Edge, NodeChange, EdgeChange, Connection,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { Box, Typography } from '@mui/material'; 
import { NodeData } from './types';
import { AgentUpdate, LlmChunk, Message, TaskEnd } from './agent';
import CustomNode from './CustomNode';
import OmniBar from './OmniBar';
import { streamAgentResponse, sendFeedback } from './agentService';
import { getLayoutedElements, nodeWidth, HORIZONTAL_GAP } from './utils/layout'; 
import { DbSchema, useContextStore, UserFile } from './store/contextStore';
import { useWorkspaceStore } from './store/workspaceStore';
import ContextDisplayBar from './components/ContextDisplayBar';
import ConversationBookmarks from './components/ConversationBookmarks'; 
import { isEqual } from 'lodash';

const TEMP_INPUT_NODE_ID = 'temp-input-node';

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
  const { workspaces, activeWorkspaceId, actions } = useWorkspaceStore();
  const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;
  const nodes = activeWorkspace?.nodes || [];
  const edges = activeWorkspace?.edges || [];
  const { project, ...reactFlowInstance } = useReactFlow(); 
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const [userInteracted, setUserInteracted] = useState(false);
  const viewportChangeByCode = useRef(false);

   // --- 使用 useRef 存储正在连接的起始节点信息 ---
  const connectingNodeId = useRef<string | null>(null);

  const stageLengthsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!userInteracted) {
      const streamingNode = nodes.find(n => n.data.isLoading);

      if (streamingNode) {
        const nodeId = streamingNode.id;
        const currentStagesLength = streamingNode.data.agentResponse?.stages.length || 0;
        const prevStagesLength = stageLengthsRef.current[nodeId] || 0;

        // 2. 只有当 stage 数量增加时，才触发聚焦
        if (currentStagesLength > prevStagesLength) {
          setTimeout(() => {
            reactFlowInstance.fitView({
              nodes: [{ id: nodeId }],
              duration: 400,
              padding: 0.2,
            });
          }, 150); // 延迟以确保节点尺寸已更新
        }
        
        // 3. 更新 ref 以供下次比较
        stageLengthsRef.current[nodeId] = currentStagesLength;
      }
    }
  // 4. 依赖项：我们监听 nodes 数组本身，以便能够深入比较其内容
  }, [nodes, reactFlowInstance]);

  // 当工作区切换时，清空 ref
  useEffect(() => {
    stageLengthsRef.current = {};
  }, [activeWorkspaceId]);

  const onViewportChange = useCallback(() => {
    // If the change was initiated by our code (fitView), ignore it.
    if (viewportChangeByCode.current) {
      return;
    }
    // Otherwise, it was a user interaction.
    if (!userInteracted) {
      setUserInteracted(true);
    }
  }, [userInteracted]);


  const updateGraph = actions.updateActiveWorkspaceGraph;

  const onNodesChange = useCallback((changes: NodeChange[]) => updateGraph({ nodes: applyNodeChanges(changes, nodes), edges }), [nodes, edges, updateGraph]);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => updateGraph({ nodes, edges: applyEdgeChanges(changes, edges) }), [nodes, edges, updateGraph]);
  const onConnect = useCallback((connection: Connection) => updateGraph({ nodes, edges: addEdge(connection, edges) }), [nodes, edges, updateGraph]);
  

  useEffect(() => {
    if (userInteracted) return; // 用户已经交互过，就不自动布局了
    if (nodes.length === 0) return;
    const activeInputNode = nodes.find(n => n.data.nodeType === 'INPUT');
    const targetNode = activeInputNode || nodes[nodes.length - 1];
    if (targetNode) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 500, nodes: [{id: targetNode.id}] });
      }, 100);
    }
  }, [nodes.length, reactFlowInstance]);

  const handleFeedback = useCallback(async (nodeId: string, feedback: 'like' | 'dislike') => {
    const performUpdate = (graphUpdater: (currentGraph: { nodes: Node<NodeData>[], edges: Edge[] }) => { nodes: Node<NodeData>[], edges: Edge[] }) => {
      const currentGraph = useWorkspaceStore.getState().workspaces[useWorkspaceStore.getState().activeWorkspaceId!];
      const newGraph = graphUpdater(currentGraph);
      updateGraph(newGraph);
    };

    const currentGraph = useWorkspaceStore.getState().workspaces[useWorkspaceStore.getState().activeWorkspaceId!];
    const aiNode = currentGraph.nodes.find(n => n.id === nodeId);
    if (!aiNode) return;

    // 1. 更新 UI，立即禁用按钮，提供即时反馈
    performUpdate(g => ({
      ...g,
      nodes: g.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, feedbackSent: feedback } } : n)
    }));

    try {
      // 2. 收集所需数据
      const sourceEdge = currentGraph.edges.find(e => e.target === nodeId);
      const userNode = currentGraph.nodes.find(n => n.id === sourceEdge?.source);
      const prompt = userNode?.data.label || 'Unknown Prompt';
      
      const lastStage = aiNode.data.agentResponse?.stages.slice(-1)[0];
      const response = (lastStage as TaskEnd)?.final_message || 'No final message.';

      const conversationHistory = buildConversationHistory(nodeId, currentGraph.nodes, currentGraph.edges);

      // 3. 调用 API
      await sendFeedback({
        turn_id: nodeId,
        feedback,
        prompt,
        response,
        conversation_history: conversationHistory,
      });

    } catch (error) {
      // 4. 如果 API 调用失败，可以选择将 UI 状态重置回来
      console.error("Reverting feedback state due to API failure.");
      performUpdate(g => ({
        ...g,
        nodes: g.nodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, feedbackSent: null } } : n)
      }));
      // Optionally show an error message to the user
    }
  }, [updateGraph]);

  const performUpdate = useCallback((graphUpdater: (currentGraph: { nodes: Node<NodeData>[], edges: Edge[] }) => { nodes: Node<NodeData>[], edges: Edge[] }) => {
    const currentGraph = useWorkspaceStore.getState().workspaces[useWorkspaceStore.getState().activeWorkspaceId!];
    const newGraph = graphUpdater(currentGraph);
    updateGraph(newGraph);
  }, [updateGraph]);

  const handleStreamError = useCallback((error: any, responseNodeId: string) => {
      console.error("Streaming Error:", error);
      performUpdate(g => ({
        ...g,
        nodes: g.nodes.map(n => {
          if (n.id === responseNodeId) {
            // 在 data 中增加一个错误消息字段
            return {
              ...n,
              data: {
                ...n.data,
                isLoading: false,
                taskStatus: 'error',
                label: `Error: ${n.data.label}`,
                currentStatusMessage: error.message || 'An unknown error occurred.',
              }
            };
          }
          return n;
        })
      }));
  }, [performUpdate]);
  
  
  const handleInputSubmit = useCallback((prompt: string,  sourceNodeId: string) => {
    const responseNodeId = uuidv4();
    const permanentNodeId = uuidv4();

    // --- 1. 直接从 Zustand store 获取最新的状态 ---
    const { workspaces, activeWorkspaceId } = useWorkspaceStore.getState();
    const latestNodes = workspaces[activeWorkspaceId!].nodes;
    const latestEdges = workspaces[activeWorkspaceId!].edges;

    const sourceNode = latestNodes.find(n => n.id === sourceNodeId);
    const inputNode = latestNodes.find(n => n.id === TEMP_INPUT_NODE_ID);
    
    if (!sourceNode || !inputNode) {
      console.error(`Could not find source node (${sourceNodeId}) or temp input node (${TEMP_INPUT_NODE_ID}) during submission.`);
      return;
    }

    const verticalGap = 40;
    const newAiNodePosition = {
      x: inputNode.position.x,
      y: inputNode.position.y + (inputNode.height || 60) + verticalGap, 
    };


      const conversationHistory = buildConversationHistory(sourceNodeId, latestNodes, latestEdges);
      const { userFiles, dbSchema, selectedTables } = useContextStore.getState();
      const injectedContext = buildInjectedContext(dbSchema, selectedTables, userFiles);
      streamAgentResponse(sourceNode, prompt, conversationHistory, injectedContext, { 
        onUpdate: (update) => {
          // 定义一个列表，包含所有我们希望在UI中作为独立“阶段”显示的子类型
          const displayableSubtypes = ['react_thought', 'react_action', 'react_observation', 'end'];

          performUpdate(g => ({
            ...g,
            nodes: g.nodes.map(n => {
              if (n.id === responseNodeId) {
                const currentResponse = n.data.agentResponse!;
                let newStages = [...currentResponse.stages];
                let newThinkingStream = currentResponse.thinkingStream || '';

                let newStatusMessage = n.data.currentStatusMessage;

                if (update.subtype === 'llm_chunk') {
                  newThinkingStream += (update as LlmChunk).content;
                  newStatusMessage = "AI is thinking..."; // 当思考时，也给一个状态
                } 
                else if (displayableSubtypes.includes(update.subtype)) {
                  newThinkingStream = ''; 
                  newStages.push(update);
                  newStatusMessage = undefined; // 当有实际阶段显示时，清除临时状态消息
                }
                // 这就是捕获所有其他事件的地方！
                else {
                  newStatusMessage = update.message; // 更新状态消息为 RAG 等事件的消息
                }

                return {
                  ...n,
                  data: {
                    ...n.data,
                    agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream,  currentStatusMessage: newStatusMessage}
                  }
                };
              }
              return n;
            })
          }));
        },
        onClose: () => {
          performUpdate(g => ({
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
                return { ...n, data: { ...n.data, isLoading: false, taskStatus: finalStatus,currentStatusMessage: undefined } };
              }
              return n;
            })
          }));
        },
        onError: (error) => {
          console.error("Streaming Error:", error);
          performUpdate(g => ({
            ...g,
            nodes: g.nodes.map(n => {
              if (n.id === responseNodeId) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    isLoading: false,
                    taskStatus: 'error',
                    label: `Error: ${n.data.label}`,
                    currentStatusMessage: undefined
                  }
                };
              }
              return n;
            })
          }));
        }
      });

      const solidifiedNodes = latestNodes.map(n => 
        n.id === TEMP_INPUT_NODE_ID 
          ? { ...n, id: permanentNodeId, data: { ...n.data, id: permanentNodeId, label: prompt, nodeType: 'USER_QUERY' as const } } 
          : n
      );

      const responseNode: Node<NodeData> = {
      id: responseNodeId, type: 'custom', position: newAiNodePosition,
      data: { id: responseNodeId, label: `Agent: ${prompt.substring(0, 40)}...`, nodeType: 'AI_RESPONSE', isLoading: true, agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' }, feedbackSent: null, onFeedback: handleFeedback }
    };
    const updatedEdges = latestEdges.map(e => e.target === TEMP_INPUT_NODE_ID ? { ...e, target: permanentNodeId } : e);
    const newEdgeToAi: Edge = { id: `e-${permanentNodeId}-${responseNodeId}`, source: permanentNodeId, target: responseNodeId, animated: true };

    // 直接使用 updateGraph 更新状态
    updateGraph({
      nodes: [...solidifiedNodes, responseNode],
      edges: [...updatedEdges, newEdgeToAi],
    });
  }, [handleFeedback, updateGraph, handleStreamError])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<NodeData>) => {
    console.log('Node clicked:', node.id);
    // 当任何节点被点击时，平滑地将视图聚焦到该节点
    reactFlowInstance.fitView({
        nodes: [{ id: node.id }],
        duration: 500, // 动画时长，带来平滑感
        padding: 0.3,  // 在节点周围留出一些边距，使其不会紧贴边缘
    });
  }, [reactFlowInstance]); 

  // 当用户开始从一个 Handle 拖拽时触发
  const onConnectStart = useCallback((_: any, { nodeId }: { nodeId: string | null }) => {
    connectingNodeId.current = nodeId;
  }, []);

  // 当用户松开鼠标，结束拖拽时触发
  const onConnectEnd = useCallback((event: MouseEvent) => {
    const targetIsPane = (event.target as HTMLElement).classList.contains('react-flow__pane');
    if (targetIsPane && connectingNodeId.current) {
      const { workspaces, activeWorkspaceId } = useWorkspaceStore.getState();
      let currentNodes = workspaces[activeWorkspaceId!].nodes.filter(n => n.id !== TEMP_INPUT_NODE_ID);
      let currentEdges = workspaces[activeWorkspaceId!].edges.filter(e => e.target !== TEMP_INPUT_NODE_ID);
      const sourceNodeId = connectingNodeId.current;
      
      const sourceNode = currentNodes.find(n => n.id === sourceNodeId);
      if (!sourceNode) return;

      const position = project({ x: event.clientX, y: event.clientY });
      const inputNode: Node<NodeData> = {
        id: TEMP_INPUT_NODE_ID,
        type: 'custom',
        position,
        data: {
          id: TEMP_INPUT_NODE_ID, label: '', nodeType: 'INPUT',
          onSubmit: (prompt, nodeId) => {
            const permanentNodeId = uuidv4();
            handleInputSubmit(prompt, sourceNodeId);
          },
        },
        selected: true,
      };

      const newEdge: Edge = { id: `e-${sourceNode.id}-${TEMP_INPUT_NODE_ID}`, source: sourceNode.id, target: TEMP_INPUT_NODE_ID };
      updateGraph({ nodes: [...currentNodes, inputNode], edges: [...currentEdges, newEdge] });
      
      setTimeout(() => {
        viewportChangeByCode.current = true;
        reactFlowInstance.fitView({ nodes: [{ id: TEMP_INPUT_NODE_ID }], padding: 0.4, duration: 300 });
        setTimeout(() => { viewportChangeByCode.current = false; }, 350);
      }, 50);
    }
  }, [reactFlowInstance, activeWorkspaceId, updateGraph, handleInputSubmit]);
  const handleCreateNode = useCallback((userPrompt: string) => {
    // 1. 从 store 中获取当前工作区的最新节点列表
    const currentNodes = useWorkspaceStore.getState().workspaces[useWorkspaceStore.getState().activeWorkspaceId!].nodes;

    // 2. 计算新节点的起始 X 坐标
    let startX = 0;
    if (currentNodes && currentNodes.length > 0) {
      // 找到所有节点中最靠右的 X 坐标
      const rightmostX = currentNodes.reduce(
        (max, node) => Math.max(max, node.position.x),
        -Infinity
      );
      // 在最右侧节点的基础上，加上一个节点的宽度和一个额外的间隙
      startX = rightmostX + nodeWidth + HORIZONTAL_GAP;
    }

    const startY = 0; // 新对话流从顶部开始
    const verticalGap = 200; // 节点之间的垂直间距
    
    const dummyParent: Node<NodeData> = { id: 'root', data: {id: 'root', label: '', nodeType: 'USER_QUERY'}, position: {x:0, y:0}, type: 'custom' };
    const conversationHistory: Message[] = [];
    const responseNodeId = uuidv4();
    const userNodeId = uuidv4();

    const performUpdate = (graphUpdater: (currentGraph: { nodes: Node<NodeData>[], edges: Edge[] }) => { nodes: Node<NodeData>[], edges: Edge[] }) => {
        const currentGraph = useWorkspaceStore.getState().workspaces[useWorkspaceStore.getState().activeWorkspaceId!];
        const newGraph = graphUpdater(currentGraph);
        updateGraph(newGraph);
      };
    
    const userNode: Node<NodeData> = {
        id: userNodeId, type: 'custom',  position: { x: startX, y: startY },
        data: { id: userNodeId, label: userPrompt, nodeType: 'USER_QUERY' },
    };
    const responseNode: Node<NodeData> = {
      id: responseNodeId, type: 'custom', position: { x: startX, y: startY + verticalGap },
      data: {
        id: responseNodeId, label: `Agent: ${userPrompt.substring(0, 40)}...`,
        nodeType: 'AI_RESPONSE', isLoading: true,
        agentResponse: { type: 'aggregated_ai_response', stages: [], thinkingStream: '' },
        feedbackSent: null,
        onFeedback: handleFeedback,
      }
    };
    
    performUpdate(currentGraph => ({
      nodes: currentGraph.nodes.concat([userNode, responseNode]),
      edges: addEdge({ id: `e-${userNode.id}-${responseNode.id}`, source: userNode.id, target: responseNode.id, animated: true }, currentGraph.edges),
    }));

    const { selectedEnvironment, dbSchema, selectedTables, userFiles } = useContextStore.getState();
    const injectedContext = buildInjectedContext(dbSchema, selectedTables, userFiles);
    // --- THIS IS THE FULL, CORRECT CALLBACK LOGIC ---
    streamAgentResponse(dummyParent, userPrompt, conversationHistory,injectedContext, {
      onUpdate: (update) => {
        // 定义一个列表，包含所有我们希望在UI中作为独立“阶段”显示的子类型
        const displayableSubtypes = ['react_thought', 'react_action', 'react_observation', 'end'];

        performUpdate(g => ({
          ...g,
          nodes: g.nodes.map(n => {
            if (n.id === responseNodeId) {
              const currentResponse = n.data.agentResponse!;
              let newStages = [...currentResponse.stages];
              let newThinkingStream = currentResponse.thinkingStream || '';

              let newStatusMessage = n.data.currentStatusMessage;

              if (update.subtype === 'llm_chunk') {
                newThinkingStream += (update as LlmChunk).content;
                newStatusMessage = "AI is thinking..."; // 当思考时，也给一个状态
              } 
              else if (displayableSubtypes.includes(update.subtype)) {
                newThinkingStream = ''; 
                newStages.push(update);
                newStatusMessage = undefined; // 当有实际阶段显示时，清除临时状态消息
              }
              // 这就是捕获所有其他事件的地方！
              else {
                newStatusMessage = update.message; // 更新状态消息为 RAG 等事件的消息
              }

              return {
                ...n,
                data: {
                  ...n.data,
                  agentResponse: { ...currentResponse, stages: newStages, thinkingStream: newThinkingStream,  currentStatusMessage: newStatusMessage}
                }
              };
            }
            return n;
          })
        }));
      },
      onClose: () => {
        performUpdate(g => ({
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
              return { ...n, data: { ...n.data, isLoading: false, taskStatus: finalStatus,currentStatusMessage: undefined } };
            }
            return n;
          })
        }));
      },
      onError: (error) => {
        console.error("Streaming Error:", error);
        performUpdate(g => ({
          ...g,
          nodes: g.nodes.map(n => {
            if (n.id === responseNodeId) {
              return {
                ...n,
                data: {
                  ...n.data,
                  isLoading: false,
                  taskStatus: 'error',
                  label: `Error: ${n.data.label}`,
                  currentStatusMessage: undefined
                }
              };
            }
            return n;
          })
        }));
      }
    });
  }, []);

  const onPaneClick = useCallback(() => {
    const currentNodes = useWorkspaceStore.getState().workspaces[activeWorkspaceId!].nodes;
    if (currentNodes.some(n => n.id === TEMP_INPUT_NODE_ID)) {
      updateGraph({
        nodes: currentNodes.filter(n => n.id !== TEMP_INPUT_NODE_ID),
        edges: edges.filter(e => e.target !== TEMP_INPUT_NODE_ID),
      });
    }
  }, [activeWorkspaceId, edges, updateGraph]);

  return (
    <div className="flow-canvas" style={{width: '100%', height: '100%', position: 'relative' }}>
      {/* {activeWorkspace && (
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 8, // zIndex 比 OmniBar 和 ContextBar 低，但比画布高
            p: .01,
            backgroundColor: 'rgba(255, 255, 255, 0.85)', // 半透明背景
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(4px)', // 毛玻璃效果
            pointerEvents: 'none', // 关键：让鼠标事件可以穿透此元素
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block">
            WORKSPACE
          </Typography>
          <Typography variant="subtitle1" fontWeight="bold">
            {activeWorkspace.name}
          </Typography>
        </Box>
      )} */}
      <OmniBar onCreateNode={handleCreateNode} />
      <ContextDisplayBar />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onMove={onViewportChange}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}