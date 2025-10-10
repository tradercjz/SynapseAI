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

const CodingModeLayout: React.FC = () => {
    const { activeTool, activeCodeServerEnv } = useUIStore();
    const { workspaces, activeWorkspaceId } = useWorkspaceStore();
    const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;
    const nodes = activeWorkspace?.nodes || [];
    const edges = activeWorkspace?.edges || [];

    return (
        <Box sx={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* 1. 左侧的图标工具栏 */}
            <SidebarToolbar />

            {/* 2. 条件渲染的上下文面板 */}
            {activeTool === 'ENVIRONMENTS' && <EnvironmentPanel />}
            {activeTool === 'USER_SPACE' && <UserSpacePanel />}

            {/* 3. 主内容区 */}
            <Box sx={{ flex: 1, position: 'relative', minWidth: 0, overflow: 'hidden' }}>
                {activeCodeServerEnv ? (
                    <PanelGroup direction="horizontal">
                        <Panel defaultSize={50} minSize={20}>
                            <FlowCanvas />
                        </Panel>
                        <PanelResizeHandle>
                            <Box sx={{ width: '8px', height: '100%', backgroundColor: 'grey.300', cursor: 'col-resize', '&:hover': { backgroundColor: 'primary.main' } }} />
                        </PanelResizeHandle>
                        <Panel defaultSize={50} minSize={20}>
                            <CodeServerPanel environment={activeCodeServerEnv} />
                        </Panel>
                    </PanelGroup>
                ) : (
                    <FlowCanvas />
                )}
                <ConversationBookmarks nodes={nodes} edges={edges} />
            </Box>
        </Box>
    );
};

// --- 将 Chat 模式的布局也提取为一个组件 ---
const ChatModeLayout: React.FC = () => {
  // 在Chat模式下，我们仍然需要工作区的数据来渲染FlowCanvas
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;
  const nodes = activeWorkspace?.nodes || [];
  const edges = activeWorkspace?.edges || [];

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative',  overflow: 'hidden'}}>
      {/* Chat 模式下，直接渲染 FlowCanvas */}
      <FlowCanvas />
      {/* 
        书签组件在Chat模式下也很有用，可以快速在不同对话流间跳转。
        注意：OmniBar 已经在 FlowCanvas 内部，所以这里不需要再渲染。
      */}
      <ConversationBookmarks nodes={nodes} edges={edges} />
    </Box>
  );
};


const MainLayout: React.FC = () => {
  const { activeMode } = useUIStore();

  return (
    <ReactFlowProvider>
      {/* 根据 activeMode 渲染不同的主布局 */}
      {activeMode === 'CODING' ? <CodingModeLayout /> : <ChatModeLayout />}
    </ReactFlowProvider>
  );
};


export default MainLayout;