// src/AgentNodeContent.tsx
import React, { useState, useEffect, useRef }  from 'react';
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box, IconButton, Tooltip } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ContentCopy as ContentCopyIcon, Check as CheckIcon  } from '@mui/icons-material';
import { AggregatedAiMessage, AgentStage, ReactThought, ReactAction, ReactObservation, TaskEnd } from './agent';

// 简化的代码高亮组件，避免引入新依赖
const SimpleCodeBlock = ({ code, lang }: { code: string; lang: string }) => (
  <pre style={{
    backgroundColor: '#2d2d2d', color: '#f8f8f2', padding: '10px',
    borderRadius: '4px', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
  }}>
    <code>{`// ${lang}\n${code}`}</code>
  </pre>
);

const FinalAnswerBlock: React.FC<{ stage: TaskEnd }> = ({ stage }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopy = () => {
    navigator.clipboard.writeText(stage.final_message).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000); // 2秒后恢复
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      // Możesz tutaj dodać obsługę błędów, np. alert
    });
  };

  return (
    // 3. 父容器需要相对定位，以便绝对定位复制按钮
    <Box sx={{ position: 'relative', padding: '8px' }} className={`stage end ${stage.success ? 'success' : ''}`}>
      <Tooltip title={copyStatus === 'idle' ? 'Copy' : 'Copied!'} placement="top">
        <IconButton
          size="small"
          onClick={handleCopy}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            color: 'grey.600'
          }}
        >
          {copyStatus === 'idle' ? <ContentCopyIcon fontSize="small" /> : <CheckIcon fontSize="small" color="success" />}
        </IconButton>
      </Tooltip>
      {stage.success ? '✅' : '❌'} <b>Task Finished:</b>
      {/* 4. 将 final_message 放在一个 div 中以便保留格式 */}
      <div style={{ marginTop: '8px' }}>{stage.final_message}</div>
    </Box>
  );
};

const getStageSummary = (stage: AgentStage): React.ReactNode => {
  switch (stage.subtype) {
    case 'react_thought':
      return <>🤔 <b>Thought</b></>;
    case 'react_action':
      const action = stage as ReactAction;
      return <>🎬 <b>Action:</b> <i>{action.tool_name}</i></>;
    case 'react_observation':
      const obs = stage as ReactObservation;
      return <>{obs.is_error ? '❌' : '🔍'} <b>Observation</b></>;
    case 'end':
      const end = stage as TaskEnd;
      return <>{end.success ? '✅' : '❌'} <b>Task Finished</b></>;
    default:
      return <>- <b>Status:</b> {stage.subtype}</>;
  }
};

const renderStage = (stage: AgentStage): React.ReactNode => {
  switch (stage.subtype) {
    case 'react_thought':
      return <div className="stage thought">🤔 <b>Thought:</b> {(stage as ReactThought).thought}</div>;
    case 'react_action':
      const action = stage as ReactAction;
      return (
        <div className="stage action">
          🎬 <b>Action:</b> Using tool <i>{action.tool_name}</i>
          <SimpleCodeBlock code={JSON.stringify(action.tool_args, null, 2)} lang="json" />
        </div>
      );
    case 'react_observation':
      const obs = stage as ReactObservation;
      return <div className={`stage observation ${obs.is_error ? 'error' : ''}`}>
        {obs.is_error ? '❌' : '🔍'} <b>Observation:</b> {obs.observation}
      </div>;
    case 'end':
      return <FinalAnswerBlock stage={stage as TaskEnd} />;
    default:
      return <div className="stage unknown">[Status: {stage.subtype}] {stage.message}</div>;
  }
};

interface AgentNodeContentProps {
  content: AggregatedAiMessage;
}

const AgentNodeContent: React.FC<AgentNodeContentProps> = ({ content }) => {
  const { stages, thinkingStream } = content;
  const [expandedStageIndex, setExpandedStageIndex] = useState<number | false>(stages.length - 1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);


  // 这里的 useEffect 只负责展开最新的 Accordion，不再负责滚动
  useEffect(() => {
    const newIndex = stages.length - 1;
    setExpandedStageIndex(newIndex);
  }, [stages.length]);

  const handleAccordionChange = (index: number) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedStageIndex(isExpanded ? index : false);
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      // 使用一个微小的延迟来确保 DOM (特别是 Accordion 的展开动画) 有时间更新
      setTimeout(() => {
        const el = scrollContainerRef.current;
        // 直接设置 scrollTop 到 scrollHeight 是最可靠的滚动到底部的方法
        el.scrollTop = el.scrollHeight;
      }, 100);
    }
    // 4. 依赖项：当 stages 数量变化 或 thinkingStream 变化时，都触发滚动
  }, [stages.length, thinkingStream]);

  return (
    <Box
        ref={scrollContainerRef}
        className="agent-content-container" 
        sx={{ pr: 1 }} // Add scroll for long conversations
    >
      {stages.map((stage, index) => (
        <Accordion
          key={index}
          expanded={expandedStageIndex === index}
          onChange={handleAccordionChange(index)}
          // 6. 移除默认样式，使其更紧凑
          sx={{ 
            boxShadow: 'none', 
            border: '1px solid #eee',
            '&:before': { display: 'none' },
            '&.Mui-expanded': { margin: '0 0 8px 0' },
            marginBottom: '8px'
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ minHeight: '36px', '& .MuiAccordionSummary-content': { m: '8px 0' } }}
          >
            <Typography variant="body2">{getStageSummary(stage)}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {/* renderStage 现在负责渲染折叠区域内的详细内容 */}
            {renderStage(stage)}
          </AccordionDetails>
        </Accordion>
      ))}

      {thinkingStream && (
        <div className="thinking-stream">
          {thinkingStream}<span className="blinking-cursor">|</span>
        </div>
      )}
    </Box>
  );
};

export default AgentNodeContent;