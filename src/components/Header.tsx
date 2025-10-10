// src/components/Header.tsx
import React from 'react';
import { AppBar, Toolbar, Typography, Box, ToggleButton, ToggleButtonGroup, Button, Avatar, Tooltip, IconButton } from '@mui/material';
import { Chat as ChatIcon, Code as CodeIcon, Logout as LogoutIcon, Workspaces as WorkspacesIcon } from '@mui/icons-material';

import { useUIStore, AppMode } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';

interface HeaderProps {
  isAuthenticated: boolean;
  onLoginClick: () => void;
  onLogoutClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAuthenticated, onLoginClick, onLogoutClick }) => {
  const { activeMode, setActiveMode, setWorkspaceMenuAnchorEl } = useUIStore();
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: AppMode | null,
  ) => {
    if (newMode !== null) {
      setActiveMode(newMode);
    }
  };

  const handleWorkspaceMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setWorkspaceMenuAnchorEl(event.currentTarget);
  };

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={{
        background: 'rgba(255, 255, 255, 0.01)', 
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        borderBottom: '1px solid rgba(230, 230, 230, 0.7)',
        zIndex: 1201,
      }}
    >
      <Toolbar variant="dense">
        {/* 左侧区域: Workspace */}
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 200 }}>
          <Tooltip title="Manage Workspaces">
            <IconButton onClick={handleWorkspaceMenuClick} sx={{ mr: 1 }}>
              <WorkspacesIcon />
            </IconButton>
          </Tooltip>
          {activeWorkspace && (
             <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                    WORKSPACE
                </Typography>
                <Typography variant="subtitle2" fontWeight="bold" noWrap color="text.primary">
                    {activeWorkspace.name}
                </Typography>
            </Box>
          )}
        </Box>

        {/* 中间区域: Chat/Coding 模式切换 */}
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={activeMode}
            exclusive
            onChange={handleModeChange}
            aria-label="application mode"
            size="small"
            sx={{
              // 整体容器加一点背景和边框，让它看起来像一个完整的“玻璃”控件
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px', // 给整个组添加圆角

              // 移除按钮之间的默认分隔线
              '& .MuiToggleButtonGroup-grouped': {
                border: 0,
                // 确保分组按钮的圆角不会干扰我们给整体设置的圆角
                '&:not(:first-of-type)': {
                  borderRadius: '8px',
                },
                '&:first-of-type': {
                  borderRadius: '8px',
                },
              },
              
              // --- 这就是实现选中效果的关键 ---
              '& .Mui-selected': {
                // 1. 使用一个半透明的白色背景，让它“亮”起来
                backgroundColor: 'rgba(255, 255, 255, 0.5) !important',
                
                // 2. 确保文字颜色清晰可见
                color: '#000 !important',
                
                // 3. 添加一个微妙的阴影，增强立体感
                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
                
                // 4. (可选) 给选中的按钮也加上一个细边框
                border: '1px solid rgba(255, 255, 255, 0.5) !important',
              },
              '& .Mui-selected:hover': {
                 // 鼠标悬停在选中项上时，让它更亮一点
                 backgroundColor: 'rgba(255, 255, 255, 0.7) !important',
              }
            }}
          >
            <ToggleButton value="CHAT" aria-label="chat mode">
              <ChatIcon sx={{ mr: 1 }} />
              Chat
            </ToggleButton>
            <ToggleButton value="CODING" aria-label="coding mode">
              <CodeIcon sx={{ mr: 1 }} />
              Coding
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* 右侧区域: 登录/用户信息 */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', minWidth: 200 }}>
          {isAuthenticated ? (
            <Tooltip title="Logout">
              <IconButton onClick={onLogoutClick}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>U</Avatar>
              </IconButton>
            </Tooltip>
          ) : (
            <Button variant="contained" onClick={onLoginClick}>
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;