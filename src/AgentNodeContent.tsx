// src/AgentNodeContent.tsx
import React from 'react';
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
      const end = stage as TaskEnd;
      return <div className={`stage end ${end.success ? 'success' : ''}`}>
        {end.success ? '✅' : '❌'} <b>Task Finished:</b> {end.final_message}
      </div>;
    default:
      return <div className="stage unknown">[Status: {stage.subtype}] {stage.message}</div>;
  }
};

interface AgentNodeContentProps {
  content: AggregatedAiMessage;
}

const AgentNodeContent: React.FC<AgentNodeContentProps> = ({ content }) => {
  const { stages, thinkingStream } = content;
  return (
    <div className="agent-content-container">
      {stages.map((stage, index) => <React.Fragment key={index}>{renderStage(stage)}</React.Fragment>)}
      {thinkingStream && (
        <div className="thinking-stream">
          {thinkingStream}<span className="blinking-cursor">|</span>
        </div>
      )}
    </div>
  );
};

export default AgentNodeContent;