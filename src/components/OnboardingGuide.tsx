import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface OnboardingGuideProps {
  // 定义一个回调函数 prop，当按钮被点击时触发
  onActionClick: () => void;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onActionClick }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        p: 4,
        backgroundColor: '#f5f5f5' // 添加一个浅灰色背景
      }}
    >
      <Paper elevation={3} sx={{ p: 6, borderRadius: '16px', textAlign: 'center', maxWidth: '600px' }}>
        <Typography variant="h4" gutterBottom>
          欢迎来到编码模式
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          要开始使用 AI 辅助编码，您首先需要一个激活的云环境。
          <br />
          环境中包含了 DolphinDB 数据库和 VS Code 编辑器。
        </Typography>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddIcon />}
          onClick={onActionClick}
        >
          创建您的第一个云环境
        </Button>
      </Paper>
    </Box>
  );
};

export default OnboardingGuide;