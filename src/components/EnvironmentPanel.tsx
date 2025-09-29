// src/components/EnvironmentPanel.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, List, ListItem, ListItemButton,
  ListItemText, CircularProgress, Alert, Chip,
  Collapse,
  Checkbox,
  Tooltip,
  FormControlLabel, Switch,
  IconButton
} from '@mui/material';
import { Add as AddIcon, ExpandMore as ExpandMoreIcon, Launch as LaunchIcon, Code as CodeIcon } from '@mui/icons-material';
import { apiClient } from '../agentService';
import { useContextStore, Environment, DbSchema } from '../store/contextStore';
import CreateEnvironmentModal from './CreateEnvironmentModal';
import { useUIStore } from '../store/uiStore';

const statusColors: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'default',
  PROVISIONING: 'info',
  RUNNING: 'success',
  DELETING: 'warning',
  DELETED: 'default',
  ERROR: 'error',
};

const EnvironmentPanel: React.FC = () => {
  const { selectedEnvironment, selectEnvironment, dbSchema, setDbSchema, selectedTables, toggleTableSelection } = useContextStore();
  const [environments, setEnvironments] = useState<any[]>([]); // Using `any` for now to match dolphin-cloud
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [expandedDb, setExpandedDb] = useState<Record<string, boolean>>({});

  const [showAll, setShowAll] = useState(false);
  const { setActiveCodeServerEnv } = useUIStore();

  const handleOpenCodeEditor = async (env: Environment) => {
        try {
            // 1. 调用后端获取 ticket
            // const response = await apiClient.post(`/environments/${env.id}/codeserver/ticket`);
            // const { ticket } = response.data;

            // if (!ticket) {
            //     alert("Failed to get access ticket for the code editor.");
            //     return;
            // }

            // // 2. 将带有 ticket 的环境对象设置到全局状态
            // // 我们需要一种方式将 ticket 传递给 CodeServerPanel
            // // 最好的方式是直接附加到 env 对象上
            // const envWithTicket = { ...env, code_server_ticket: ticket };
            // setActiveCodeServerEnv(envWithTicket);
            setActiveCodeServerEnv(env);

        } catch (error) {
            console.error("Error getting code server ticket:", error);
            alert("Could not open the code editor. See console for details.");
        }
    };

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

  const filteredEnvironments = useMemo(() => {
    if (showAll) {
      return environments; // If toggle is on, show all
    }
    // Otherwise, only show environments that are "active"
    const activeStatuses = ['RUNNING', 'PROVISIONING', 'PENDING'];
    return environments.filter(env => activeStatuses.includes(env.status));
  }, [environments, showAll]); 

  useEffect(() => {
    if (!selectedEnvironment) {
      setDbSchema(null);
      return;
    }
    const fetchSchema = async () => {
      setIsSchemaLoading(true);
      try {
        const response = await apiClient.get<DbSchema>(`/environments/${selectedEnvironment.id}/schema`);
        setDbSchema(response.data);
        // Automatically expand all databases
        const initialExpansionState: Record<string, boolean> = {};
        Object.keys(response.data).forEach(dbName => { initialExpansionState[dbName] = true; });
        setExpandedDb(initialExpansionState);
      } catch (err) {
        console.error("Failed to fetch schema:", err);
        setDbSchema(null); // Clear schema on error
      } finally {
        setIsSchemaLoading(false);
      }
    };
    fetchSchema();
  }, [selectedEnvironment, setDbSchema]);

  const handleCreateSuccess = (newEnv: Environment) => {
    setIsModalOpen(false);
    fetchEnvironments();
    selectEnvironment(newEnv);
  };

  const toggleDbExpansion = (dbName: string) => {
    setExpandedDb(prev => ({ ...prev, [dbName]: !prev[dbName] }));
  };

  return (
      <Box sx={{ width: 320, height: '100vh', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexShrink: 0 }}>
          <Typography variant="h6">Environments</Typography>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setIsModalOpen(true)}>Create</Button>
        </Box>
        
        <FormControlLabel
          control={<Switch checked={showAll} onChange={(e) => setShowAll(e.target.checked)} size="small" />}
          label={<Typography variant="caption">Show All</Typography>}
          sx={{ alignSelf: 'flex-start', mb: 1 }}
        />
        
        {isLoading && environments.length === 0 && <CircularProgress sx={{ mx: 'auto', mt: 4 }} />}
        {error && <Alert severity="error">{error}</Alert>}
        
        <List sx={{ overflowY: 'auto', flex: 1 }}>
          {filteredEnvironments.length > 0 ? filteredEnvironments.map((env) => (
            // --- MODIFIED: Added secondaryAction to the ListItem ---
            <ListItem 
              key={env.id} 
              disablePadding
              secondaryAction={
                
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {/* 新的 Code Server 按钮 */}
                  <Tooltip title="Open Code Editor" placement="right">
                    <span>
                      <IconButton
                        edge="end"
                        aria-label="code-editor"
                        size="small"
                        // 按钮启用条件：环境运行中且有 code_server_public_ip
                        disabled={env.status !== 'RUNNING' || !env.code_server_public_ip}
                        onClick={() => {
                          handleOpenCodeEditor(env); 
                        }}
                      >
                        <CodeIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  {/* 原有的跳转按钮 */}
                  <Tooltip title="Open DolphinDB Web UI" placement="right">
                    <span>
                      <IconButton
                        edge="end"
                        aria-label="launch"
                        size="small"
                        disabled={env.status !== 'RUNNING' || !env.public_ip}
                        onClick={() => {
                          if (env.public_ip && env.port) {
                            window.open(`http://${env.public_ip}:${env.port}`, '_blank');
                          }
                        }}
                      >
                        <LaunchIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              }
            >
              <ListItemButton
                selected={selectedEnvironment?.id === env.id}
                onClick={() => selectEnvironment(env)}
                sx={{ borderRadius: 1 }}
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
                  secondaryTypographyProps={{ component: 'span' }}
                />
              </ListItemButton>
            </ListItem>
          )) : (
            !isLoading && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                {showAll ? "No environments found." : "No active environments. Toggle 'Show All' to see others."}
              </Typography>
            )
          )}
        </List>
      </Box>
      {/* Schema Section */}
      <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Schema Context</Typography>
        {isSchemaLoading && <CircularProgress size={24} />}
        {!isSchemaLoading && selectedEnvironment && dbSchema && (
          Object.entries(dbSchema).map(([dbName, tables]) => (
            <Box key={dbName} mb={1}>
              <ListItemButton onClick={() => toggleDbExpansion(dbName)} sx={{ pl: 0 }}>
                <ExpandMoreIcon sx={{ transform: expandedDb[dbName] ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                <ListItemText primary={dbName} primaryTypographyProps={{ fontWeight: 'bold' }} />
              </ListItemButton>
              <Collapse in={expandedDb[dbName]} timeout="auto" unmountOnExit>
                <List dense component="div" disablePadding sx={{ pl: 2 }}>
                  {Object.entries(tables).map(([tableName, columns]) => {
                    const tableKey = `${dbName}.${tableName}`;
                    const tooltipText = columns.map(c => `${c.name} (${c.type})`).join('\n');
                    return (
                      <ListItem key={tableKey} secondaryAction={
                          <Checkbox edge="end" checked={!!selectedTables[tableKey]} onChange={() => toggleTableSelection(tableKey)} />
                      } disablePadding>
                        <Tooltip title={tooltipText} placement="right">
                          <ListItemText primary={tableName} />
                        </Tooltip>
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          ))
        )}
        {!isSchemaLoading && selectedEnvironment && !dbSchema && <Alert severity="warning" sx={{mt:2}}>Could not load schema for this environment.</Alert>}
        {!selectedEnvironment && <Typography variant="body2" color="text.secondary" sx={{mt:2}}>Select an environment to view its schema.</Typography>}
      </Box>
      <CreateEnvironmentModal open={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleCreateSuccess} />
    </Box>
  );
};

export default EnvironmentPanel;