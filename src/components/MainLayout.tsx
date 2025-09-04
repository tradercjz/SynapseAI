// src/components/MainLayout.tsx
import React from 'react';
import { Box } from '@mui/material';
import { ReactFlowProvider } from 'reactflow';
import SidebarToolbar from './SidebarToolbar';
import EnvironmentPanel from './EnvironmentPanel';
import FlowCanvas from '../FlowCanvas'; // Note the path might be different depending on your folder structure
import { useUIStore } from '../store/uiStore';

const MainLayout: React.FC = () => {
  const { activeTool } = useUIStore();

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* 1. The persistent icon toolbar on the far left */}
      <SidebarToolbar />

      {/* 2. The conditionally rendered context panel */}
      {/* We use a simple boolean check. In the future, a switch statement could handle more tools. */}
      {activeTool === 'ENVIRONMENTS' && <EnvironmentPanel />}
      
      {/* 3. The main content area which holds the FlowCanvas */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <ReactFlowProvider>
          <FlowCanvas />
        </ReactFlowProvider>
      </Box>
    </Box>
  );
};

export default MainLayout;