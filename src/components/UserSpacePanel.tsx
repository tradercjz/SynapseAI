// src/components/UserSpacePanel.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, List, ListItem, ListItemText, IconButton, CircularProgress, Chip, Switch, FormControlLabel } from '@mui/material';
import { Delete as DeleteIcon, Description as FileIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { useContextStore, UserFile } from '../store/contextStore';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// The worker path should be correct from the last step
pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;

const UserSpacePanel: React.FC = () => {
  // We need to get the correct actions from the store.
  // Let's assume the store has `addFile`, `updateFileStatus`, `toggleFileAssociation`, and `removeFile`.
  const { userFiles, addFile: addFileToStore, updateFileStatus, toggleFileAssociation, removeFile } = useContextStore();

  const processAndAddFiles = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const fileId = `${file.name}-${Date.now()}`;
      
      // Add a file placeholder to the store immediately for instant UI feedback
      addFileToStore({ id: fileId, name: file.name, type: file.type, content: null, status: 'processing', isAssociated: false });
      
      try {
        let textContent = '';
        if (file.type === 'application/pdf') {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const text = await page.getTextContent();
            textContent += text.items.map(s => (s as any).str).join(' ');
          }
        } else if (file.type.startsWith('text/')) {
          textContent = await file.text();
        } else {
          // Handle unsupported files gracefully
          const errorMessage = `File type "${file.type}" is not supported for content extraction.`;
          updateFileStatus(fileId, 'error', errorMessage);

          // Skip to the next file
          continue; 
        }
        // Update the store with the final 'ready' status and the extracted content
        updateFileStatus(fileId, 'ready', textContent);
      } catch (error) {
        console.error("Failed to process file:", error);
        updateFileStatus(fileId, 'error', 'Failed to extract text from this file.');
      }
    }
  }, [addFileToStore, updateFileStatus]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: processAndAddFiles,
    multiple: true,
  });

  const getStatusIcon = (status: UserFile['status']) => {
    if (status === 'processing') return <CircularProgress size={20} className="processing-spinner" />;
    if (status === 'ready') return <CheckCircleIcon fontSize="small" color="success" />;
    if (status === 'error') return <ErrorIcon fontSize="small" color="error" />;
    return <FileIcon />;
  };

  return (
    <Box sx={{ width: 350, height: '100vh', borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" mb={2}>User Space</Typography>
        <div {...getRootProps({ className: `dropzone ${isDragActive ? 'dropzone-active' : ''}` })}>
          <input {...getInputProps()} />
          <Typography color="text.secondary">
            {isDragActive ? "Drop files here..." : "Drag & drop, or click to upload"}
          </Typography>
        </div>
      </Box>
      <List sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {userFiles.length > 0 
          ? userFiles.map((file) => (
              <ListItem
                key={file.id}
                className="file-list-item"
                secondaryAction={
                  <IconButton edge="end" aria-label="delete" onClick={() => removeFile(file.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ alignItems: 'flex-start' }}
              >
                <Box sx={{ mr: 1.5, mt: 1.5 }}>
                  {getStatusIcon(file.status)}
                </Box>
                <ListItemText
                  primary={file.name}
                  primaryTypographyProps={{ noWrap: true, fontWeight: 500 }}
                  secondary={
                    <FormControlLabel 
                      control={
                        <Switch 
                          size="small"
                          checked={file.isAssociated}
                          onChange={() => toggleFileAssociation(file.id)}
                          disabled={file.status !== 'ready'}
                        />
                      }
                      label={<Typography variant="caption">Associate</Typography>}
                      sx={{ ml: -1, mt: 0.5 }} // Negative margin to align with text
                    />
                  }
                  secondaryTypographyProps={{component: 'div'}}
                />
              </ListItem>
          )) 
          : <Typography sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>Your user space is empty.</Typography>
        }
      </List>
    </Box>
  );
};
// We need to modify the store slightly to add a file with a full payload.
// Let's assume the store's `addFile` action is updated to accept a partial UserFile object.

// In `src/store/contextStore.ts`, your `addFile` should look like this:
/*
  addFile: (fileData: Omit<UserFile, 'content' | 'isAssociated'>) => {
    const newFile: UserFile = {
      ...fileData,
      content: null,
      isAssociated: false,
    };
    set(state => ({ userFiles: [...state.userFiles, newFile] }));
  },
*/

export default UserSpacePanel;