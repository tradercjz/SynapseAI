// src/components/WorkspaceManager.tsx
import React, { useState } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Box, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import { Workspaces as WorkspacesIcon, Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { useWorkspaceStore, Workspace } from '../store/workspaceStore';
import { useUIStore } from '../store/uiStore';

export default function WorkspaceManager() {
  // 从 workspace store 获取数据和 actions
  const { workspaces, activeWorkspaceId, actions: workspaceActions } = useWorkspaceStore();
  
  // 从 ui store 获取菜单的 anchor 和 setter
  const { workspaceMenuAnchorEl, setWorkspaceMenuAnchorEl } = useUIStore();
  
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const handleMenuClose = () => {
    setWorkspaceMenuAnchorEl(null);
  };

  const handleSwitch = (id: string) => {
    workspaceActions.switchWorkspace(id);
    handleMenuClose();
  };

  const handleOpenCreateModal = () => {
    setNewWorkspaceName('');
    setCreateModalOpen(true);
    handleMenuClose();
  };
  
  const handleCreate = () => {
    if (newWorkspaceName.trim()) {
        workspaceActions.createWorkspace(newWorkspaceName.trim());
        setCreateModalOpen(false);
    }
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm(`Are you sure you want to delete workspace "${workspaces[id].name}"? This cannot be undone.`)) {
        workspaceActions.deleteWorkspace(id);
    }
    handleMenuClose();
  };


  return (
    <>
      {/* 移除了原来的 Box 和 Button，只留下 Menu 和 Dialog */}
      <Menu
        anchorEl={workspaceMenuAnchorEl} // <-- 使用全局状态
        open={Boolean(workspaceMenuAnchorEl)} // <-- 使用全局状态
        onClose={handleMenuClose}
        // 让菜单从图标的右侧弹出
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
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

      <Dialog open={isCreateModalOpen} onClose={() => setCreateModalOpen(false)}>
        {/* ... Dialog 内容保持不变 ... */}
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