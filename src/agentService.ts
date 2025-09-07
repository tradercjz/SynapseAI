// src/agentService.ts
import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { AgentUpdate, Message } from './agent';
import type { Node } from 'reactflow';
import axios from 'axios';
import type { NodeData } from './types'; // 我们自己的 NodeData 类型

// 定义回调函数的类型
export interface StreamCallbacks {
  onUpdate: (chunk: AgentUpdate) => void;
  onClose: () => void;
  onError: (error: any) => void;
}

const API_BASE_URL = 'http://127.0.0.1:8001/api/v1'; 


const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// 添加一个请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 我们也导出一个helper，让其他地方也能用
export { apiClient };


export const streamAgentResponse = (
  sourceNode: Node<NodeData>,
  prompt: string,
  conversationHistory: Message[], 
  injectedContext: object | null,
  callbacks: StreamCallbacks,
) => {
  const { onUpdate, onClose, onError } = callbacks;

  const token = localStorage.getItem('token');
  if (!token) {
      alert("You must be logged in to use the agent.");
      onError(new Error("User not authenticated."));
      return;
  }

  // 这里的 envId 需要一个来源，暂时硬编码或从 sourceNode 中获取
  const envId = 'some-environment-id'; 

  let conversation_history;
  if (!conversationHistory || conversationHistory.length === 0) {
    conversation_history = [{ content: prompt, role: 'user' }];
  } else {
    conversation_history = [
      
      ...conversationHistory.map(m => ({
        role: m.sender,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      { content: prompt, role: 'user' }
    ];
  }

  // Define the type for requestBody to include optional injected_context
  type RequestBody = {
    conversation_history: any;
    injected_context?: object | null;
  };

  const requestBody: RequestBody = {
    conversation_history,
  };

  if (injectedContext) {
    requestBody.injected_context = injectedContext;
  }

  fetchEventSource(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestBody),

    // 关键：处理消息事件
    onmessage(event) {
      try {
        const update = JSON.parse(event.data) as AgentUpdate;
        onUpdate(update); // 将解析后的数据块通过回调传给React组件

        // 如果是任务结束信号，则手动关闭连接
        if (update.subtype === 'end' || update.subtype === 'error') {
          onClose();
        }
      } catch (e) {
        onError(e);
      }
    },
    onclose() {
      onClose();
    },
    onerror(err) {
        // This handler is for network errors or errors thrown from onopen/onmessage.
        console.error("EventSource failed:", err);
        
        // Create a structured error payload to send back to the UI.
        const errorPayload: AgentUpdate = {
          type: 'error',
          subtype: 'network_error',
          message: err.message || 'A network error occurred. Please check your connection or the server status.'
        };

        // Pass the structured error to the FlowCanvas component.
        onError(errorPayload);

        // It is crucial to re-throw the error to prevent retries.
        throw err;
      }
  });
};

export interface FeedbackPayload {
  turn_id: string;
  feedback: 'like' | 'dislike';
  prompt: string;
  response: string;
  conversation_history: Message[];
}

export const sendFeedback = async (payload: FeedbackPayload): Promise<void> => {
  try {
    await apiClient.post('/feedback', payload);
    console.log('Feedback sent successfully for turn:', payload.turn_id);
  } catch (error) {
    console.error('Failed to send feedback:', error);
    // You could add user-facing error handling here if needed
    throw error;
  }
};
