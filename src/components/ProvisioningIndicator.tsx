import React from 'react';
import { Box, Typography, Paper, CircularProgress, Stepper, Step, StepLabel, Chip } from '@mui/material';
import { Environment } from '../store/contextStore';

interface ProvisioningIndicatorProps {
  environment: Environment; // 接收当前正在创建的环境对象
}

// 定义状态的顺序和对应的标签
const statusSteps = ['PENDING', 'PROVISIONING', 'RUNNING'];
const stepLabels: Record<string, string> = {
  PENDING: '请求已提交',
  PROVISIONING: '云资源配置中',
  RUNNING: '环境启动成功'
};

const ProvisioningIndicator: React.FC<ProvisioningIndicatorProps> = ({ environment }) => {
  // 确定当前状态在步骤条中的位置
  const activeStep = statusSteps.indexOf(environment.status);
  const isError = environment.status === 'ERROR';

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        p: 4,
        backgroundColor: '#f5f5f5'
      }}
    >
      <Paper elevation={3} sx={{ p: 6, borderRadius: '16px', textAlign: 'center', minWidth: '600px' }}>
        <Typography variant="h4" gutterBottom>
          正在为您准备云环境
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          请稍候，后台正在为您分配和启动资源。此过程可能需要 1-3 分钟。
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 4 }}>
            <CircularProgress />
            <Box>
                <Typography variant="overline" color="text.secondary">环境 ID</Typography>
                <Typography fontFamily="monospace">{environment.id}</Typography>
            </Box>
        </Box>
        
        {isError ? (
            <Box sx={{mt: 4}}>
                <Typography variant="h6" color="error.main">创建失败</Typography>
                <Paper variant="outlined" sx={{p: 2, mt: 1, backgroundColor: 'error.lighter', color: 'error.darker'}}>
                    <Typography fontFamily="monospace">{environment.message || '未知错误，请检查环境列表获取详细信息。'}</Typography>
                </Paper>
            </Box>
        ) : (
            <Stepper activeStep={activeStep} alternativeLabel sx={{mt: 4}}>
            {statusSteps.map((label) => (
                <Step key={label}>
                <StepLabel>{stepLabels[label] || label}</StepLabel>
                </Step>
            ))}
            </Stepper>
        )}
      </Paper>
    </Box>
  );
};

export default ProvisioningIndicator;