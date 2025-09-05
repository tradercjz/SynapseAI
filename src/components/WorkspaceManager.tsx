// src/components/WorkspaceManager.tsx
import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Box, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import { Workspaces as WorkspacesIcon, Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useWorkspaceStore, Workspace } from '../store/workspaceStore';

export default function WorkspaceManager() {
  const { workspaces, activeWorkspaceId, actions } = useWorkspaceStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const activeWorkspace = activeWorkspaceId ? workspaces[activeWorkspaceId] : null;

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSwitch = (id: string) => {
    actions.switchWorkspace(id);
    handleMenuClose();
  };

  const handleOpenCreateModal = () => {
    setNewWorkspaceName('');
    setCreateModalOpen(true);
    handleMenuClose();
  };
  
  const handleCreate = () => {
    if (newWorkspaceName.trim()) {
        actions.createWorkspace(newWorkspaceName.trim());
        setCreateModalOpen(false);
    }
  };
  
  const handleDelete = (id: string) => {
    // Basic confirmation
    if (window.confirm(`Are you sure you want to delete workspace "${workspaces[id].name}"? This cannot be undone.`)) {
        actions.deleteWorkspace(id);
    }
    handleMenuClose();
  };


  return (
    <>
      <Box sx={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <Tooltip title="Manage Workspaces">
          <Button
            variant="contained"
            startIcon={<WorkspacesIcon />}
            onClick={handleMenuClick}
          >
            {activeWorkspace ? activeWorkspace.name : 'No Workspace'}
          </Button>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleOpenCreateModal}>
            <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
            <ListItemText>New Workspace</ListItemText>
          </MenuItem>
          <Divider />
          {Object.values(workspaces)
            .sort((a, b) => b.lastModified - a.lastModified)
            .map((ws: Workspace) => (
            <MenuItem key={ws.id} selected={ws.id === activeWorkspaceId} onClick={() => handleSwitch(ws.id)}>
              <ListItemText sx={{ mr: 2 }}>{ws.name}</ListItemText>
              <Tooltip title="Delete Workspace">
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(ws.id); }}>
                      <DeleteIcon fontSize='small' />
                  </IconButton>
              </Tooltip>
            </MenuItem>
          ))}
        </Menu>
      </Box>

      {/* Create Workspace Modal */}
      <Dialog open={isCreateModalOpen} onClose={() => setCreateModalOpen(false)}>
        <DialogTitle>Create New Workspace</DialogTitle>
        <DialogContent>
            <TextField
                autoFocus
                margin="dense"
                label="Workspace Name"
                type="text"
                fullWidth
                variant="standard"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}