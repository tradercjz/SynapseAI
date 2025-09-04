// src/CustomNode.tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Paper, TextField } from '@mui/material';
import type { NodeData } from './types';
import AgentNodeContent from './AgentNodeContent';

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
  return (
    <div className="custom-node">
      <Handle type="target" position={Position.Top} />
      
      <div className="custom-node-label">{data.label}</div>
      
      {isAI && data.agentResponse && <AgentNodeContent content={data.agentResponse} />}
      {isAI && data.isLoading && <div className="loading-indicator">Agent is working...</div>}
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(CustomNode);