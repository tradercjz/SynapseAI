// src/components/EnvironmentPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemText, CircularProgress, Alert, Chip
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { apiClient } from '../agentService';
import { useContextStore, Environment } from '../store/contextStore';
import CreateEnvironmentModal from './CreateEnvironmentModal';

const statusColors: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'default',
  PROVISIONING: 'info',
  RUNNING: 'success',
  DELETING: 'warning',
  DELETED: 'default',
  ERROR: 'error',
};

const EnvironmentPanel: React.FC = () => {
  const { selectedEnvironment, selectEnvironment } = useContextStore();
  const [environments, setEnvironments] = useState<any[]>([]); // Using `any` for now to match dolphin-cloud
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchEnvironments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<any[]>('/environments/');
      setEnvironments(response.data);
    } catch (err) {
      setError('Failed to load environments.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnvironments();
    // Optional: add a poller to auto-refresh the list
    const intervalId = setInterval(fetchEnvironments, 15000);
    return () => clearInterval(intervalId);
  }, [fetchEnvironments]);

  const handleCreateSuccess = (newEnv: Environment) => {
    setIsModalOpen(false);
    fetchEnvironments();
    selectEnvironment(newEnv);
  };

  return (
    <Box
      sx={{
        width: 320,
        height: '100vh',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Environments</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setIsModalOpen(true)}
        >
          Create
        </Button>
      </Box>

      {isLoading && environments.length === 0 && <CircularProgress sx={{ mx: 'auto', mt: 4 }} />}
      {error && <Alert severity="error">{error}</Alert>}

      <List sx={{ overflowY: 'auto', flex: 1 }}>
        {environments.map((env) => (
          <ListItem key={env.id} disablePadding>
            <ListItemButton
              selected={selectedEnvironment?.id === env.id}
              onClick={() => selectEnvironment(env)}
            >
              <ListItemText
                primary={env.id}
                primaryTypographyProps={{ noWrap: true, fontFamily: 'monospace', fontSize: '0.9rem' }}
                secondary={
                  <Chip 
                    label={env.status || 'UNKNOWN'}
                    color={statusColors[env.status] || 'default'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <CreateEnvironmentModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </Box>
  );
};

export default EnvironmentPanel;