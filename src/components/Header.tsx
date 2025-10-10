// src/components/Header.tsx
import React from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    ToggleButton,
    ToggleButtonGroup,
    Button,
    Avatar,
    Tooltip,
    IconButton,
} from "@mui/material";
import {
    Chat as ChatIcon,
    Code as CodeIcon,
    Logout as LogoutIcon,
    Workspaces as WorkspacesIcon,
} from "@mui/icons-material";

import { useUIStore, AppMode } from "../store/uiStore";
import { useWorkspaceStore } from "../store/workspaceStore";

interface HeaderProps {
    isAuthenticated: boolean;
    onLoginClick: () => void;
    onLogoutClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
    isAuthenticated,
    onLoginClick,
    onLogoutClick,
}) => {
    const { activeMode, setActiveMode, setWorkspaceMenuAnchorEl } = useUIStore();
    const { workspaces, activeWorkspaceId } = useWorkspaceStore();

    const activeWorkspace = activeWorkspaceId
    ? workspaces[activeWorkspaceId]
    : null;

    const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: AppMode | null
    ) => {
        if (newMode !== null) {
        setActiveMode(newMode);
        }
    };

    const handleWorkspaceMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setWorkspaceMenuAnchorEl(event.currentTarget);
    };

    return (
        <AppBar
        position="static"
        color="default"
        elevation={1}
        sx={{ zIndex: 1201 }}
        >
        {" "}
        {/* zIndex高于ReactFlow */}
        <Toolbar variant="dense">
            {/* 左侧区域: Workspace */}
            <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
            <Tooltip title="Manage Workspaces">
                <IconButton onClick={handleWorkspaceMenuClick} sx={{ mr: 1 }}>
                <WorkspacesIcon />
                </IconButton>
            </Tooltip>
            {activeWorkspace && (
                <Box>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", lineHeight: 1.2 }}
                >
                    WORKSPACE
                </Typography>
                <Typography variant="subtitle2" fontWeight="bold" noWrap>
                    {activeWorkspace.name}
                </Typography>
                </Box>
            )}
            </Box>

            {/* 中间区域: Chat/Coding 模式切换 */}
            <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <ToggleButtonGroup
                value={activeMode}
                exclusive
                onChange={handleModeChange}
                aria-label="application mode"
            >
                <ToggleButton value="CHAT" aria-label="chat mode">
                <ChatIcon sx={{ mr: 1 }} />
                Chat
                </ToggleButton>
                <ToggleButton value="CODING" aria-label="coding mode">
                <CodeIcon sx={{ mr: 1 }} />
                Coding
                </ToggleButton>
            </ToggleButtonGroup>
            </Box>

            {/* 右侧区域: 登录/用户信息 */}
            <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            {isAuthenticated ? (
                <Tooltip title="Logout">
                <IconButton onClick={onLogoutClick}>
                    <Avatar
                    sx={{ bgcolor: "secondary.main", width: 32, height: 32 }}
                    >
                    U
                    </Avatar>
                </IconButton>
                </Tooltip>
            ) : (
                <Button variant="contained" onClick={onLoginClick}>
                Login
                </Button>
            )}
            </Box>
        </Toolbar>
        </AppBar>
    );
};

export default Header;
