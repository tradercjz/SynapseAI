import React, { useState } from 'react';
import { Box, TextField, IconButton, CircularProgress } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

interface ChatInputBarProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const ChatInputBar: React.FC<ChatInputBarProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box
      component="form"
      sx={{
        display: 'flex',
        alignItems: 'center',
        paddingX: 1.5, 
        borderTop: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
      }}
      onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={5}
        variant="outlined"
        size="small"
        placeholder="在这里输入您的问题..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        autoFocus
        sx={{
          // --- 修改点 2: 核心样式覆盖 ---
          height: '100%', // 让 TextField 填满父容器的高度
          '& .MuiOutlinedInput-root': {
            height: '100%',
            // 移除 TextField 的边框
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            // 移除 hover 时的边框效果
            '&:hover .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            // 移除 focus 时的边框效果
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              border: 'none',
            },
            // 将内边距应用到输入区域，而不是整个 root
            padding: 0, 
            alignItems: 'flex-start', // 当多行时，从顶部对齐
          },
          // --- 修改点 3: 为真正的 input 元素添加内边距 ---
          '& .MuiOutlinedInput-input': {
            padding: '12px 0', // 给予文本垂直方向的呼吸空间
          },
        }}
      />
      <IconButton
        color="primary"
        type="submit"
        disabled={isLoading || !prompt.trim()}
        sx={{ ml: 1.5 }}
      >
        {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
      </IconButton>
    </Box>
  );
};

export default ChatInputBar;