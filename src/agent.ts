// 这是一个基础接口，所有从Agent流返回的更新都遵循这个结构
export interface AgentUpdate {
  type: "task_status" | "executor_status" | "USER_INTERACTION";
  subtype: string;
  message: string;
}

export interface LlmChunk extends AgentUpdate {
  subtype: "llm_chunk";
  content: string;
}

// 具体的思考、行动、观察等更新类型
export interface ReactThought extends AgentUpdate {
  subtype: "react_thought";
  thought: string;
}

export interface ReactAction extends AgentUpdate {
  subtype: "react_action";
  tool_name: string;
  tool_args: Record<string, any>;
}

export interface ReactObservation extends AgentUpdate {
  subtype: "react_observation";
  observation: string;
  is_error: boolean;
}

// 交互请求类型
export interface UserInteraction extends AgentUpdate {
  type: "USER_INTERACTION";
  options: string[];
  task_id: string; // 后端会附带这个ID
}

// 任务结束类型
export interface TaskEnd extends AgentUpdate {
    subtype: "end";
    success: boolean;
    final_message: string;
    final_script?: string;
}


export type AgentStage = ReactThought | ReactAction | ReactObservation | UserInteraction | TaskEnd;


// 这是我们在UI中用来渲染一个完整的、多阶段AI响应的消息内容结构
export interface AggregatedAiMessage {
  type: 'aggregated_ai_response';
  stages: AgentStage[];         // 存储所有已完成的阶段
  streamingText?: string;      // 存储正在实时流入的文本
  thinkingStream?: string;   // 存储正在实时流入的思考文本
}

// 更新 Message.content 类型
export type MessageContent = string | AggregatedAiMessage;

export interface Message {
  id: number;
  sender: 'user' | 'assistant';
  content: MessageContent;
}