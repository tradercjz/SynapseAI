// src/components/AttachedInput.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TextField, Paper, IconButton } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { Node } from 'reactflow';
import { NodeData } from '../types';

interface AttachedInputProps {
  activeNode: Node<NodeData> | null;
  onSubmit: (prompt: string, parentNodeId: string) => void;
  onClose: () => void;
}

const AttachedInput: React.FC<AttachedInputProps> = ({ activeNode, onSubmit, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeNode) {
      // 当激活节点变化时，自动聚焦输入框
      inputRef.current?.focus();
    } else {
      setPrompt(''); // 关闭时清空
    }
  }, [activeNode]);

  if (!activeNode) {
    return null;
  }

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt.trim(), activeNode.id);
      setPrompt('');
      onClose(); // 提交后自动关闭
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
    if (event.key === 'Escape') {
      onClose();
    }
  };

  // 动态计算输入框的位置
  const style: React.CSSProperties = {
    position: 'absolute',
    // 使用 activeNode 的位置和尺寸来定位
    top: activeNode.position.y + (activeNode.height || 100) + 15,
    left: activeNode.position.x,
    width: activeNode.width || 300,
    zIndex: 20, // 确保在节点之上
    transition: 'top 0.2s ease, left 0.2s ease',
  };

  return (
    <Paper elevation={4} style={style}>
      <Box sx={{ display: 'flex', p: 1, alignItems: 'center' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          variant="outlined"
          size="small"
          placeholder="Ask a follow-up..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <IconButton color="primary" onClick={handleSubmit} sx={{ ml: 1 }}>
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

// Box is not defined, so we need to import it.
import { Box } from '@mui/material';
export default AttachedInput;