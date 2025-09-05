// src/components/ContextDisplayBar.tsx
import React from 'react';
import { Box, Paper, Typography, Chip, Tooltip } from '@mui/material';
import { Storage as StorageIcon, Description as DescriptionIcon } from '@mui/icons-material';
import { useContextStore } from '../store/contextStore';

const ContextDisplayBar: React.FC = () => {
  const { 
    selectedTables, 
    userFiles, 
    toggleTableSelection, 
    toggleFileAssociation 
  } = useContextStore();

  // Get an array of the keys for all selected tables
  const activeTableKeys = Object.keys(selectedTables).filter(key => selectedTables[key]);
  
  // Get an array of all associated file objects
  const associatedFiles = userFiles.filter(file => file.isAssociated);

  // If no context is selected, don't render anything
  if (activeTableKeys.length === 0 && associatedFiles.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={2}
      sx={{
        position: 'absolute',
        top: 85, // Position it below the OmniBar
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9, // Just below the OmniBar
        p: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderRadius: '8px',
        maxWidth: '60%',
        overflowX: 'auto', // Allow horizontal scrolling if many items
        bgcolor: 'grey.100',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
        Active Context:
      </Typography>
      
      {/* Render Chips for selected tables */}
      {activeTableKeys.map(tableKey => (
        <Tooltip key={tableKey} title="Click to remove from context">
          <Chip
            icon={<StorageIcon />}
            label={tableKey}
            size="small"
            onDelete={() => toggleTableSelection(tableKey)}
          />
        </Tooltip>
      ))}

      {/* Render Chips for associated files */}
      {associatedFiles.map(file => (
        <Tooltip key={file.id} title="Click to remove from context">
          <Chip
            icon={<DescriptionIcon />}
            label={file.name}
            size="small"
            onDelete={() => toggleFileAssociation(file.id)}
          />
        </Tooltip>
      ))}
    </Paper>
  );
};

export default ContextDisplayBar;