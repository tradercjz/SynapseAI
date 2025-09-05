// src/components/SidebarToolbar.tsx
import React from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { CloudQueue as CloudQueueIcon, Folder as FolderIcon, Storefront as StorefrontIcon, Workspaces as WorkspacesIcon  } from '@mui/icons-material';
import { useUIStore, ActiveTool } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore'; 

const SidebarToolbar: React.FC = () => {
  const { activeTool, toggleActiveTool, setWorkspaceMenuAnchorEl  } = useUIStore();
  const { workspaces, activeWorkspaceId } = useWorkspaceStore();
  
  const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;

  const handleToggle = (tool: ActiveTool) => {
    toggleActiveTool(tool);
  };

  const handleWorkspaceMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setWorkspaceMenuAnchorEl(event.currentTarget);
  };

  const workspaceTooltip = `Workspace: ${activeWorkspace ? activeWorkspace.name : 'None'}`;

  return (
    <Box
      sx={{
        width: 60,
        height: '100vh',
        bgcolor: 'grey.900', // A dark background for the toolbar
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 2,
        gap: 2,
      }}
    >
      <Tooltip title="Environments" placement="right">
        <IconButton
          onClick={() => handleToggle('ENVIRONMENTS')}
          sx={{
            color: 'white',
            bgcolor: activeTool === 'ENVIRONMENTS' ? 'primary.main' : 'transparent',
            '&:hover': {
              bgcolor: activeTool === 'ENVIRONMENTS' ? 'primary.dark' : 'grey.800',
            },
          }}
        >
          <CloudQueueIcon />
        </IconButton>
      </Tooltip>
      
      {/* Placeholder for the next feature */}
      <Tooltip title="User Space" placement="right">
        <IconButton
          onClick={() => handleToggle('USER_SPACE')}
          sx={{
            color: 'white',
            bgcolor: activeTool === 'USER_SPACE' ? 'primary.main' : 'transparent',
            '&:hover': { bgcolor: activeTool === 'USER_SPACE' ? 'primary.dark' : 'grey.800' },
          }}
        >
          <FolderIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="MCP App Marketplace (Coming Soon)" placement="right">
        {/* The span wrapper ensures the tooltip works even on a disabled button */}
        <span>
          <IconButton
            disabled 
            sx={{ color: 'grey.600' }} // A muted color for disabled icons
          >
            <StorefrontIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Box sx={{ marginTop: 'auto' }}>
        <Tooltip title={workspaceTooltip} placement="right">
          <IconButton
            onClick={handleWorkspaceMenuClick}
            sx={{ color: 'white', '&:hover': { bgcolor: 'grey.800' } }}
          >
            <WorkspacesIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default SidebarToolbar;