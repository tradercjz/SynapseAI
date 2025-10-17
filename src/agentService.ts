// src/agentService.ts
import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { AgentUpdate, Message } from './agent';
import type { Node } from 'reactflow';
import axios from 'axios';
import type { NodeData } from './types'; // 我们自己的 NodeData 类型
import { useContextStore } from './store/contextStore';
import { useUIStore } from './store/uiStore';

// 定义回调函数的类型
export interface StreamCallbacks {
  onUpdate: (chunk: AgentUpdate) => void;
  onClose: () => void;
  onError: (error: any) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://183.134.101.139:8001/api/v1'; 


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
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    // --- 您的新增逻辑 ---
    // 如果 token 不存在，并且这是一个需要认证的 API 调用 (我们可以假设所有 API 都需要)
    if (!token) {
      console.warn('No token found in localStorage. Blocking API request and opening login modal.');
      
      // 调用全局 action 打开登录框
      useUIStore.getState().openLoginModal();
      
      // 创建一个自定义的 CancelToken 来中断此次请求
      const cancelToken = new axios.CancelToken(cancel => cancel('Request cancelled: No authentication token.'));
      
      // 返回一个带有 cancelToken 的配置，axios 会识别并中断它
      // 同时附带一个 rejection，让调用方知道请求失败了
      return Promise.reject({ ...config, cancelToken });
    }

    // 如果 token 存在，则正常附加到请求头
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    
    const newToken = response.headers['x-new-token'];
    if (newToken) {
      console.log('Received a new token, updating localStorage...');
      localStorage.setItem('token', newToken);
    }

    return response;
  }, // 对成功的响应不做任何处理
  (error) => {
    // 检查响应是否存在，以及状态码是否为 401
    if (error.response && error.response.status === 401) {
      console.warn('API request returned 401. Opening login modal.');
      // 从 localStorage 中清除可能已失效的 token
      localStorage.removeItem('token');
      // 调用全局 action 来打开登录框
      // 使用 getState() 可以从 store 外部访问状态和 actions
      useUIStore.getState().openLoginModal();
    }
    // 必须将错误继续抛出，以便原始的调用者知道请求失败了
    return Promise.reject(error);
  }
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

  const selectedEnv = useContextStore.getState().selectedEnvironment;
  const envId = selectedEnv ? selectedEnv.id : null;

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
    env_id?: string | null;
  };

  const requestBody: RequestBody = {
    conversation_history,
  };

  if (envId) {
    requestBody.env_id = envId;
  }


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
        if (!event.data) {
          return; // 忽略空的 keep-alive 消息
        }
        const update = JSON.parse(event.data) as AgentUpdate;
        onUpdate(update); // 将解析后的数据块通过回调传给React组件

        // 如果是任务结束信号，则手动关闭连接
        if (update.subtype === 'end' || update.subtype === 'error') {
          //onClose();
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
