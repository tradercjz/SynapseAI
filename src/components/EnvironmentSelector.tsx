// src/components/EnvironmentSelector.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Menu, MenuItem, ListItemIcon, ListItemText, CircularProgress, Tooltip, Divider } from '@mui/material';
import { CloudQueue as CloudQueueIcon, Add as AddIcon, Check as CheckIcon } from '@mui/icons-material';
import { apiClient } from '../agentService';
import { useContextStore, Environment } from '../store/contextStore';
import CreateEnvironmentModal from './CreateEnvironmentModal'; // Import the modal

const EnvironmentSelector: React.FC = () => {
  const { selectedEnvironment, selectEnvironment } = useContextStore();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // State for the modal
  const open = Boolean(anchorEl);

  // Use useCallback to memoize the fetch function
  const fetchEnvironments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<Environment[]>('/environments/');
      setEnvironments(response.data);
    } catch (err) {
      setError('Failed to load environments.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSelect = (env: Environment) => {
    selectEnvironment(env);
    handleCloseMenu();
  };
  
  const handleOpenCreateModal = () => {
    setIsModalOpen(true);
    handleCloseMenu();
  };
  
  const handleCreateSuccess = (newEnv: Environment) => {
    setIsModalOpen(false);
    fetchEnvironments(); // Refresh the list
    selectEnvironment(newEnv); // Automatically select the new environment
  };

  const buttonText = selectedEnvironment ? `Env: ${selectedEnvironment.id.substring(0, 8)}...` : 'Select Environment';

  return (
    <>
      <Tooltip title={selectedEnvironment ? `Current Environment: ${selectedEnvironment.id}` : "Select a cloud environment"}>
        <Button
          variant="outlined"
          size="large"
          startIcon={isLoading ? <CircularProgress size={20} /> : <CloudQueueIcon />}
          onClick={handleClick}
          disabled={isLoading || !!error}
          sx={{ textTransform: 'none' }}
        >
          {error ? 'Error' : buttonText}
        </Button>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
      >
        {/* "Create New" option at the top */}
        <MenuItem onClick={handleOpenCreateModal}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Create New Environment</ListItemText>
        </MenuItem>
        
        <Divider />

        {environments.length > 0 ? (
          environments.map((env) => (
            <MenuItem key={env.id} onClick={() => handleSelect(env)}>
              {selectedEnvironment?.id === env.id && (
                <ListItemIcon>
                  <CheckIcon fontSize="small" />
                </ListItemIcon>
              )}
              <ListItemText inset={!selectedEnvironment || selectedEnvironment.id !== env.id}>
                {env.id}
              </ListItemText>
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No environments found.</MenuItem>
        )}
      </Menu>

      {/* Render the modal, controlled by our state */}
      <CreateEnvironmentModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
};

export default EnvironmentSelector;