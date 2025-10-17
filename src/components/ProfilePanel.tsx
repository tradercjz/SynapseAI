// FILE: ./src/components/ProfilePanel.tsx

import React from 'react';
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider, Box, Typography } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useUIStore } from '../store/uiStore';

interface ProfilePanelProps {
  userEmail: string | null;
  onLogout: () => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ userEmail, onLogout }) => {
  const { profileMenuAnchorEl, setProfileMenuAnchorEl } = useUIStore();

  const handleClose = () => {
    setProfileMenuAnchorEl(null);
  };

  const handleLogout = () => {
    onLogout();
    handleClose();
  };

  return (
    <Menu
      anchorEl={profileMenuAnchorEl}
      open={Boolean(profileMenuAnchorEl)}
      onClose={handleClose}
      // 调整菜单弹出的位置
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      // 添加一些样式
      PaperProps={{
        sx: {
          mt: 1.5,
          width: 220,
          boxShadow: '0px 5px 15px rgba(0,0,0,0.15)',
        },
      }}
    >
      {/* 顶部显示用户邮箱 */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary" noWrap>
          Signed in as
        </Typography>
        <Typography variant="subtitle2" fontWeight="bold" noWrap>
          {userEmail || '...'}
        </Typography>
      </Box>

      <Divider />

      {/* 登出按钮 */}
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default ProfilePanel;