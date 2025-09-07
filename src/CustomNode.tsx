// src/CustomNode.tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Paper, TextField, IconButton, Tooltip } from '@mui/material';
import { ThumbUp, ThumbDown, ThumbUpOutlined, ThumbDownOutlined } from '@mui/icons-material'; 
import type { NodeData } from './types';
import AgentNodeContent from './AgentNodeContent';
import classNames from 'classnames'; 

const CustomNode: React.FC<NodeProps<NodeData>> = ({ data, id }) => {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data.nodeType === 'INPUT') {
      inputRef.current?.focus();
    }
  }, [data.nodeType]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (prompt.trim() && data.onSubmit) {
        data.onSubmit(prompt.trim(), id);
      }
    }
  };
  
  // --- Conditional Rendering Logic ---
  if (data.nodeType === 'INPUT') {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          padding: '10px 15px', 
          borderRadius: '8px', 
          border: '2px dashed #007bff',
          background: '#f0f7ff',
          width: 350, // Give it a fixed width
        }}
      >
        <Handle type="target" position={Position.Top} />
        <TextField
          inputRef={inputRef}
          fullWidth
          variant="standard"
          placeholder="Type your question..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          InputProps={{ disableUnderline: true }}
        />
      </Paper>
    );
  }

  // --- Default Rendering for USER_QUERY and AI_RESPONSE ---
  const isAI = data.nodeType === 'AI_RESPONSE';
  const lastStage = data.agentResponse?.stages?.[data.agentResponse.stages.length - 1];
  const isFinished = !data.isLoading && lastStage?.subtype === 'end';

  const nodeClasses = classNames('custom-node', {
    'streaming': isAI && data.isLoading,
    'finished-success': isAI && !data.isLoading && data.taskStatus === 'success',
    'finished-error': isAI && !data.isLoading && data.taskStatus === 'error',
  });

  return (
    <div className={nodeClasses}>
      <Handle type="target" position={Position.Top} />
      
      <div className="custom-node-label">{data.label}</div>
      
      {isAI && data.agentResponse && (
        // 1. 添加一个 Box 来包裹 AgentNodeContent
        // 2. 在这个 Box 上添加 onClick 事件处理器
        <Box onClick={(event) => event.stopPropagation()}>
          <AgentNodeContent content={data.agentResponse} />
        </Box>
      )}
      {isAI && data.isLoading && (
        <div className="status-indicator">
          {data.currentStatusMessage || 'Agent is working...'}
          <span className="pulsing-ellipsis"></span>
        </div>
      )}

      {isAI && isFinished && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center',
            borderTop: '1px solid #eee',
            paddingTop: '4px',
            marginTop: '8px',
          }}
          onClick={(e) => e.stopPropagation()} // 防止触发追问
        >
          <Tooltip title="Good response">
            <span> {/* Span wrapper for disabled state */}
              <IconButton
                size="small"
                onClick={() => data.onFeedback?.(id, 'like')}
                disabled={!!data.feedbackSent}
              >
                {data.feedbackSent === 'like' ? <ThumbUp /> : <ThumbUpOutlined />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="Bad response">
            <span>
              <IconButton
                size="small"
                onClick={() => data.onFeedback?.(id, 'dislike')}
                disabled={!!data.feedbackSent}
              >
                {data.feedbackSent === 'dislike' ? <ThumbDown /> : <ThumbDownOutlined />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(CustomNode);