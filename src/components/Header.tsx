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
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(1px)',
        WebkitBackdropFilter: 'blur(1px)',
        borderBottom: '1px solid rgba(230, 230, 230, 0.5)',
        zIndex: 1201,
      }}
    >
      <Toolbar variant="dense">
        {/* 左侧区域: Workspace */}
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 200 }}>
          {/* ... 内容不变 ... */}
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
          <Box
            sx={{
              position: 'relative',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '8px',
              p: '4px',
              display: 'inline-flex',
            }}
          >
            {/* --- “水滴”滑块的核心样式升级 --- */}
            <Box
              sx={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                height: 'calc(100% - 8px)',
                width: 'calc(50% - 4px)',
                borderRadius: '6px',
                zIndex: 0,
                
                // --- 动画效果 (保持不变) ---
                transition: 'transform 0.4s cubic-bezier(0.65, 0, 0.35, 1)',
                transform: activeMode === 'CODING' ? 'translateX(100%)' : 'translateX(0)',
                
                // --- “亮晶晶”质感的核心 ---
                // 1. 使用多层渐变来模拟高光和主体光泽
                backgroundImage: `
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 20%),
                  linear-gradient(to bottom, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.5))
                `,
                
                // 2. 使用内嵌阴影(inset)来创造3D凹凸感和边缘高光
                boxShadow: `
                  inset 0 1px 2px rgba(255, 255, 255, 1),
                  inset 0 -1px 2px rgba(0, 0, 0, 0.1),
                  0 4px 12px rgba(0, 0, 0, 0.15)
                `,
                
                // 3. 一个更亮的边框来定义轮廓
                border: '1px solid rgba(255, 255, 255, 0.9)',
              }}
            />
            
            <ToggleButtonGroup
              value={activeMode}
              exclusive
              onChange={handleModeChange}
              aria-label="application mode"
              size="small"
              sx={{
                backgroundColor: 'transparent',
                border: 'none',
                '& .MuiToggleButtonGroup-grouped': { border: 0 },
              }}
            >
              <ToggleButton 
                value="CHAT" 
                aria-label="chat mode"
                sx={{ 
                  zIndex: 1,
                  fontWeight: activeMode === 'CHAT' ? 600 : 400, // 选中时字体加粗
                  color: activeMode === 'CHAT' ? '#0B3D77' : 'text.secondary', // 选中时用更深的蓝色
                  textShadow: activeMode === 'CHAT' ? '0 1px 1px rgba(255, 255, 255, 0.5)' : 'none', // 给选中的文字加一点亮色文字阴影，使其“浮”起来
                  backgroundColor: 'transparent !important',
                  border: 'none !important',
                  transition: 'color 0.4s, font-weight 0.4s', // 文字颜色和粗细也加上过渡效果
                }}
              >
                <ChatIcon sx={{ mr: 1 }} />
                Chat
              </ToggleButton>
              <ToggleButton 
                value="CODING" 
                aria-label="coding mode"
                sx={{ 
                  zIndex: 1,
                  fontWeight: activeMode === 'CODING' ? 600 : 400,
                  color: activeMode === 'CODING' ? '#0B3D77' : 'text.secondary',
                  textShadow: activeMode === 'CODING' ? '0 1px 1px rgba(255, 255, 255, 0.5)' : 'none',
                  backgroundColor: 'transparent !important',
                  border: 'none !important',
                  transition: 'color 0.4s, font-weight 0.4s',
                }}
              >
                <CodeIcon sx={{ mr: 1 }} />
                Coding
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* 右侧区域: 登录/用户信息 (保持不变) */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', minWidth: 200 }}>
          {/* ... (内容不变) ... */}
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