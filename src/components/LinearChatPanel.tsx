import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useContextStore } from '../store/contextStore';
import { streamAgentResponse } from '../agentService';
import { Message, AgentUpdate, LlmChunk, TaskEnd } from '../agent';
import { v4 as uuidv4 } from 'uuid';
import ChatInputBar from './ChatInputBar';
import AgentNodeContent from '../AgentNodeContent'; // 复用 AgentNodeContent 来显示 AI 消息

const LinearChatPanel: React.FC = () => {
  const { workspaces, activeWorkspaceId, actions } = useWorkspaceStore();
  const { selectedEnvironment, dbSchema, selectedTables, userFiles } = useContextStore();
  const conversation = activeWorkspaceId ? workspaces[activeWorkspaceId].codingConversation : [];
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 当对话历史更新时，自动滚动到底部
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [conversation]);


  const handleSubmit = useCallback(async (prompt: string) => {
    setIsAiLoading(true);

    // 1. 创建并添加用户消息
    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      content: prompt,
    };
    actions.addMessageToCodingConversation(userMessage);

    // 2. 创建一个 AI 消息的占位符
    const aiMessagePlaceholder: Message = {
      id: Date.now() + 1,
      sender: 'assistant',
      content: {
        type: 'aggregated_ai_response',
        stages: [],
        thinkingStream: '',
      },
    };
    actions.addMessageToCodingConversation(aiMessagePlaceholder);
    
    // 3. 构建上下文和对话历史
    // 注意：这里的 buildInjectedContext 和 buildConversationHistory 需要从 FlowCanvas.tsx 中导出或复制过来
    // 为了简单起见，我们假设它们已经被正确导入
    const injectedContext = buildInjectedContext(dbSchema, selectedTables, userFiles);
    // 编码模式下的历史就是 conversation 本身
    const conversationHistory = conversation.slice(0, -1); // 排除刚添加的 AI 占位符

    // 4. 调用流式 API
    streamAgentResponse(
      { id: 'coding-mode-root', position: {x:0, y:0}, data: {id:'root', label:'', nodeType: 'USER_QUERY'} }, // 虚拟的 sourceNode
      prompt,
      conversationHistory,
      injectedContext,
      {
        onUpdate: (update: AgentUpdate) => {
          actions.updateLastMessageInCodingConversation(lastMessage => {
            const content = lastMessage.content as any;
            let newStages = [...content.stages];
            let newThinkingStream = content.thinkingStream || '';

            if (update.subtype === 'llm_chunk') {
              newThinkingStream += (update as LlmChunk).content;
            } else if (['react_thought', 'react_action', 'react_observation', 'end'].includes(update.subtype)) {
              newThinkingStream = '';
              newStages.push(update);
            }
            
            return { ...lastMessage, content: { ...content, stages: newStages, thinkingStream: newThinkingStream } };
          });
        },
        onClose: () => {
          setIsAiLoading(false);
           actions.updateLastMessageInCodingConversation(lastMessage => {
            const content = lastMessage.content as any;
             const lastStage = content.stages[content.stages.length - 1];
              if (lastStage && lastStage.subtype !== 'end') {
                 // 如果流关闭时最后一个阶段不是 'end'，我们可以手动添加一个
                 const finalStage: TaskEnd = {
                    type: 'end',
                    subtype: 'end',
                    success: true,
                    message: "Stream closed.",
                    final_message: "任务已完成。"
                };
                 return { ...lastMessage, content: { ...content, stages: [...content.stages, finalStage], thinkingStream: '' } };
             }
            return lastMessage;
           });
        },
        onError: (error: any) => {
          setIsAiLoading(false);
          const errorMessage: Message = {
            id: Date.now(), sender: 'assistant',
            content: `发生错误: ${error.message || '未知错误'}`
          };
          actions.addMessageToCodingConversation(errorMessage);
        },
      }
    );
  }, [actions, dbSchema, selectedTables, userFiles, conversation]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'white',
      }}
    >
      {/* <Box sx={{ p: '12px 16px', borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Typography variant="subtitle1" fontWeight={600}>AI 助手</Typography>
      </Box> */}

      <Box ref={scrollContainerRef} sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: 'grey.50' }}>
        {conversation.map((message) => (
          <Box key={message.id} sx={{ mb: 2.5 }}>
            {message.sender === 'user' ? (
              <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'primary.lightest', borderRadius: '12px', borderTopLeftRadius: '2px', maxWidth: '85%', ml: 'auto', border: '1px solid #e0e0e0' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.content as string}</Typography>
              </Paper>
            ) : (
              <Box>
                {typeof message.content === 'string' ? (
                  <Typography variant="body2" color="error">{message.content}</Typography>
                ) : (
                  // 复用 AgentNodeContent 来渲染复杂的 AI 消息
                  <AgentNodeContent content={message.content as any} />
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <ChatInputBar onSubmit={handleSubmit} isLoading={isAiLoading} />
    </Box>
  );
};

export default LinearChatPanel;

// Helper function (can be moved to a utils file)
// NOTE: This is a simplified copy from FlowCanvas.tsx. You might want to move it to a shared utils file.
function buildInjectedContext(
  schema: any, 
  selectedTables: Record<string, boolean>,
  userFiles: any[]
): object | null {
  const contextParts: any = {};
  let hasContent = false;
  if (schema && Object.values(selectedTables).some(v => v)) {
    let markdown = "Schema for selected tables:\n";
    for (const tableKey in selectedTables) {
      if (selectedTables[tableKey]) {
        const [dbName, tableName] = tableKey.split('.');
        if (schema[dbName] && schema[dbName][tableName]) {
          const columns = schema[dbName][tableName];
          const columnsStr = columns.map((c: any) => `${c.name}: ${c.type}`).join(', ');
          markdown += `- ${tableName}(${columnsStr})\n`;
        }
      }
    }
    contextParts.schemas = { markdown, source_paths: Object.keys(selectedTables).filter(k => selectedTables[k]) };
    hasContent = true;
  }
  const associatedFiles = userFiles.filter(f => f.isAssociated && f.status === 'ready' && f.content);
  if (associatedFiles.length > 0) {
    contextParts.files = {};
    associatedFiles.forEach(file => {
      contextParts.files[file.name] = { type: 'full_content', content: file.content };
    });
    hasContent = true;
  }
  return hasContent ? contextParts : null;
}