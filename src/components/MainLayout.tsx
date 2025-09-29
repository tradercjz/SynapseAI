// src/components/MainLayout.tsx
import React from 'react';
import { Box } from '@mui/material';
import { ReactFlowProvider } from 'reactflow';
import SidebarToolbar from './SidebarToolbar';
import EnvironmentPanel from './EnvironmentPanel';
import FlowCanvas from '../FlowCanvas'; // Note the path might be different depending on your folder structure
import { useUIStore } from '../store/uiStore';
import UserSpacePanel from './UserSpacePanel';
import CodeServerPanel from './CodeServerPanel';

import { useWorkspaceStore } from '../store/workspaceStore';
import ConversationBookmarks from './ConversationBookmarks';

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";

const MainLayout: React.FC = () => {
  const { activeTool, activeCodeServerEnv  } = useUIStore();
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;
  const nodes = activeWorkspace?.nodes || [];
  const edges = activeWorkspace?.edges || [];

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* 1. 左侧的图标工具栏 */}
      <SidebarToolbar />

      {/* 2. 条件渲染的上下文面板 (环境、用户空间等) */}
      {activeTool === 'ENVIRONMENTS' && <EnvironmentPanel />}
      {activeTool === 'USER_SPACE' && <UserSpacePanel />}
      
      {/* 3. 主内容区容器，它会占据所有剩余的空间 */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <ReactFlowProvider>
            {/* 
              根据 code editor 是否激活，条件渲染不同的布局。
              这是实现动态分屏的核心。
            */}
            {activeCodeServerEnv ? (
                // --- 状态一：Code Editor 激活，渲染可拖拽的分栏布局 ---
                <PanelGroup direction="horizontal">
                    {/* 第一个面板：用于显示对话流画布 */}
                    <Panel defaultSize={50} minSize={20}>
                        <FlowCanvas />
                    </Panel>
                    
                    {/* 拖拽手柄：即两个面板之间的分割线 */}
                    <PanelResizeHandle>
                        <Box
                          sx={{
                            width: '8px',
                            height: '100%',
                            backgroundColor: 'grey.300',
                            cursor: 'col-resize',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '&:hover': {
                              backgroundColor: 'primary.main',
                              transition: 'background-color 0.2s ease',
                            },
                          }}
                        />
                    </PanelResizeHandle>
                    
                    {/* 第二个面板：用于显示 Code Editor */}
                    <Panel defaultSize={50} minSize={20}>
                        <CodeServerPanel environment={activeCodeServerEnv} />
                    </Panel>
                </PanelGroup>
            ) : (
                // --- 状态二：Code Editor 未激活，只渲染全屏的对话流画布 ---
                <FlowCanvas />
            )}

            {/* 
              书签组件。
              它被放置在 ReactFlowProvider 内部，但在 PanelGroup 的外部，
              使其能够正确定位在主内容区的右侧，且不受分栏布局的影响。
            */}
            <ConversationBookmarks nodes={nodes} edges={edges} />
        </ReactFlowProvider>
      </Box>
    </Box>
  );
};


export default MainLayout;