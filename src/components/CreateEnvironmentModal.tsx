// src/components/CreateEnvironmentModal.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, CircularProgress, Alert
} from '@mui/material';
import { apiClient } from '../agentService'; // Make sure apiClient is exported

interface CreateEnvironmentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newEnv: any) => void; // Callback on successful creation
}

const CreateEnvironmentModal: React.FC<CreateEnvironmentModalProps> = ({ open, onClose, onSuccess }) => {
  const [cpu, setCpu] = useState('2');
  const [memory, setMemory] = useState('4');
  const [lifetimeHours, setLifetimeHours] = useState('8');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Your API might have a different structure, adjust as needed.
      const response = await apiClient.post('/environments/', {
        spec_cpu: parseFloat(cpu),
        spec_memory: parseFloat(memory),
        lifetime_hours: parseInt(lifetimeHours, 10),
      });
      onSuccess(response.data); // Pass the newly created environment back
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create environment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create New Environment</DialogTitle>
      <DialogContent>
        <Box component="form" sx={{ mt: 2 }}>
          <TextField
            label="vCPU Cores" type="number" fullWidth margin="normal"
            value={cpu} onChange={(e) => setCpu(e.target.value)} required
          />
          <TextField
            label="Memory (GiB)" type="number" fullWidth margin="normal"
            value={memory} onChange={(e) => setMemory(e.target.value)} required
          />
          <TextField
            label="Lifetime (Hours)" type="number" fullWidth margin="normal"
            value={lifetimeHours} onChange={(e) => setLifetimeHours(e.target.value)} required
          />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateEnvironmentModal;