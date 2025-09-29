// src/components/CodeServerPanel.tsx
import React from "react";
import { Box, Typography, IconButton, Paper, Tooltip } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Environment } from "../store/contextStore";
import { useUIStore } from "../store/uiStore";

interface CodeServerPanelProps {
  // 我们现在期望 environment 对象上可能有一个 ticket
  environment: Environment & { code_server_ticket?: string };
}

const CodeServerPanel: React.FC<CodeServerPanelProps> = ({ environment }) => {
  const { setActiveCodeServerEnv } = useUIStore();

  // 从 environment 对象中获取 code-server 的 IP 和端口
  // 注意：这里的字段名 (code_server_public_ip, code_server_port) 必须和后端 API 返回的保持一致
  const codeServerIp = environment.code_server_public_ip;
  const codeServerPort = environment.code_server_port;

  const ticket = environment.code_server_ticket;
  
  const codeServerUrl = `/api/v1/environments/${environment.id}/codeserver/`;

  const handleClose = () => {
    setActiveCodeServerEnv(null); // 调用 action 关闭面板
  };

  return (
    <Paper
      elevation={4}
      sx={{
        height: "100%",
        width: '100%',
        display: "flex",
        flexDirection: "column",
        borderLeft: 1,
        borderColor: "divider",
        transition: "width 0.3s ease-in-out", // 平滑过渡动画
        flexShrink: 0, // 防止面板被压缩
      }}
    >
      {/* <Box
        sx={{
          p: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "grey.100", // 给标题栏加个背景色
          flexShrink: 0,
          height: 18,
        }}
      >
        <Typography variant="subtitle2" sx={{ ml: 1 }}>
          Code Editor: {environment.id}
        </Typography>
        <Tooltip title="Close Editor">
          <IconButton size="small" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box> */}

      {codeServerUrl ? (
        <iframe
          src={codeServerUrl}
          title={`Code Server for ${environment.id}`}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            flexGrow: 1 
          }}
        />
      ) : (
        <Box sx={{ p: 3, textAlign: "center" }}>
          <Typography color="error">
            Code Server is not available for this environment.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CodeServerPanel;
