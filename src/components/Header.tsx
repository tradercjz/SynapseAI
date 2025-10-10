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
          {/* --- 核心修改：整个 ToggleButtonGroup 的结构和样式都将改变 --- */}
          <Box
            sx={{
              position: 'relative', // 1. 父容器必须是相对定位，为“水滴”滑块提供定位锚点
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderRadius: '8px',
              p: '4px', // 留出内边距
              display: 'inline-flex', // 让容器包裹住内部按钮
            }}
          >
            {/* 2. 这就是我们的“水滴”滑块。它是一个独立的 Box 元素 */}
            <Box
              sx={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                height: 'calc(100% - 8px)', // 高度撑满内边距
                width: 'calc(50% - 4px)',   // 宽度为一半减去内边距
                
                // 3. “水灵灵”的质感升级！
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.6))',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.7)',
                border: '1.5px solid white',
                
                borderRadius: '6px',
                zIndex: 0, // 把它放在按钮文字的下面
                
                // 4. “水滴”动画的核心！
                transition: 'transform 0.4s cubic-bezier(0.65, 0, 0.35, 1)',
                transform: activeMode === 'CODING' ? 'translateX(100%)' : 'translateX(0)',
              }}
            />
            
            <ToggleButtonGroup
              value={activeMode}
              exclusive
              onChange={handleModeChange}
              aria-label="application mode"
              size="small"
              sx={{
                // 5. 移除按钮组自带的背景和边框，完全透明
                backgroundColor: 'transparent',
                border: 'none',
                // 移除按钮之间的分隔线
                '& .MuiToggleButtonGroup-grouped': { border: 0 },
              }}
            >
              <ToggleButton 
                value="CHAT" 
                aria-label="chat mode"
                sx={{ 
                  zIndex: 1, // 确保文字在滑块之上
                  color: activeMode === 'CHAT' ? 'primary.main' : 'text.secondary', // 选中时文字颜色更深
                  fontWeight: activeMode === 'CHAT' ? 'bold' : 'normal',
                  // 移除默认的背景和边框，避免干扰
                  backgroundColor: 'transparent !important',
                  border: 'none !important',
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
                  color: activeMode === 'CODING' ? 'primary.main' : 'text.secondary',
                  fontWeight: activeMode === 'CODING' ? 'bold' : 'normal',
                  backgroundColor: 'transparent !important',
                  border: 'none !important',
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