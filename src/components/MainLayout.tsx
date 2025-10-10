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
import { useContextStore, Environment } from '../store/contextStore';

import CreateEnvironmentModal from './CreateEnvironmentModal';
import OnboardingGuide from './OnboardingGuide';
import LinearChatPanel from './LinearChatPanel';
import ProvisioningIndicator from './ProvisioningIndicator';

import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { useState } from 'react';
import { useCallback } from 'react';
import { useEffect } from 'react';
import { apiClient } from '../agentService';

const CodingModeLayout: React.FC = () => {
  const { activeTool } = useUIStore();
  const { selectedEnvironment, selectEnvironment } = useContextStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 只有在当前没有选中任何环境时，才触发自动选择逻辑
    if (!selectedEnvironment) {
      console.log("No environment selected. Attempting to auto-select a running one...");
      
      // 定义一个异步函数来获取并选择环境
      const findAndSelectRunningEnv = async () => {
        try {
          // 从后端获取用户的所有环境列表
          const response = await apiClient.get<Environment[]>('/environments/');
          const allEnvs = response.data;
          
          // 在返回的列表中查找第一个处于 'RUNNING' 状态的环境
          const runningEnv = allEnvs.find(env => env.status === 'RUNNING');
          
          if (runningEnv) {
            console.log(`Auto-selecting running environment: ${runningEnv.id}`);
            // 如果找到了，就调用全局 action 来选中它
            selectEnvironment(runningEnv);
          } else {
            console.log("No running environments found to auto-select.");
          }
        } catch (error) {
          console.error("Failed to fetch environments for auto-selection:", error);
        }
      };

      findAndSelectRunningEnv();
    }
  }, [selectedEnvironment, selectEnvironment]);

  // 我们现在有三个状态，所以用更明确的变量名
  const isEnvironmentReady = selectedEnvironment && selectedEnvironment.status === 'RUNNING';
  const isEnvironmentProvisioning = selectedEnvironment && !isEnvironmentReady;

  const handleCreateSuccess = useCallback((newEnv: Environment) => {
    setIsModalOpen(false);
    selectEnvironment(newEnv); // 这会触发 UI 进入 "provisioning" 状态
  }, [selectEnvironment]);


  if (isEnvironmentReady) {
    // 状态三: 环境已就绪，渲染 IDE
    return (
      <Box sx={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', bgcolor: 'grey.100' }}>
        <SidebarToolbar />
        {activeTool === 'ENVIRONMENTS' && <EnvironmentPanel />}
        {activeTool === 'USER_SPACE' && <UserSpacePanel />}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={35} minSize={25}><LinearChatPanel /></Panel>
            <PanelResizeHandle>
              <Box sx={{ width: '8px', height: '100%', bgcolor: 'grey.300', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', '&:hover': { bgcolor: 'primary.main' }}}>
                <Box sx={{ width: '2px', height: '40px', bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '2px' }} />
              </Box>
            </PanelResizeHandle>
            <Panel defaultSize={65} minSize={30}><CodeServerPanel environment={selectedEnvironment} /></Panel>
          </PanelGroup>
        </Box>
      </Box>
    );
  } else if (isEnvironmentProvisioning) {
    // 状态二: 环境创建中，渲染加载指示器
    return (
        <Box sx={{ height: '100%', width: '100%' }}>
            {/* 
              注意: 我们在这里也渲染了 SidebarToolbar 和 EnvironmentPanel。
              这是为了确保 EnvironmentPanel 的轮询机制能够持续工作，
              从而在环境就绪后自动更新状态。
              它们将在视觉上被 ProvisioningIndicator 覆盖。
            */}
            <Box sx={{ display: 'flex', height: '100%' }}>
                <SidebarToolbar />
                <EnvironmentPanel />
                {/* 
                  我们使用绝对定位让指示器覆盖在整个内容区域之上，
                  这样用户就无法与仍在加载的背景进行交互。
                */}
                <Box sx={{ position: 'absolute', top: 0, left: 60, right: 0, bottom: 0, zIndex: 10 }}>
                  <ProvisioningIndicator environment={selectedEnvironment!} />
                </Box>
            </Box>
        </Box>
    );
  } else {
    // 状态一: 初始状态，渲染引导页
    return (
      <Box sx={{ height: '100%', width: '100%' }}>
        <OnboardingGuide onActionClick={() => setIsModalOpen(true)} />
        <CreateEnvironmentModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </Box>
    );
  }
};

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
    
      <Box sx={{ height: '100%', width: '100%' }}>
        {/* 
          渲染画布模式布局，并根据 activeMode 控制其显示或隐藏 
        */}
        <Box 
          sx={{ 
            display: activeMode === 'CHAT' ? 'flex' : 'none', 
            height: '100%', 
            width: '100%' 
          }}
        >
          <ChatModeLayout />
        </Box>

        {/* 
          渲染编码模式布局，并根据 activeMode 控制其显示或隐藏 
        */}
        <Box 
          sx={{ 
            display: activeMode === 'CODING' ? 'flex' : 'none', 
            height: '100%', 
            width: '100%' 
          }}
        >
          <CodingModeLayout />
        </Box>
      </Box>
    </ReactFlowProvider>
  );
};


export default MainLayout;