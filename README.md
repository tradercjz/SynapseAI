# SynapseAI - 可视化AI推理与探索环境

SynapseAI 不是一个普通的聊天机器人。它将您与AI的对话转化为动态、可交互的思维导图，将AI的每一个思考步骤都透明地呈现在您眼前。它是一个为复杂问题分析、深度研究和知识探索而设计的强大工具。


![SynapseAI demo演示](./src/assets/demo.gif)
---

## ✨ 核心特性

*   **可视化对话流 (Visual Dialogue Flow)**:
    *   告别线性的聊天记录。所有提问和AI回应都以节点形式存在于一个无限画布上。
    *   通过连接线清晰地看到对话的逻辑脉络，轻松创建和探索多个对话分支。

*   **实时AI思考过程 (Real-time AI Reasoning)**:
    *   完全透明的AI工作流。实时观察AI的**思考（Thought）**、**行动（Action - 调用工具）**和**观察（Observation - 工具返回结果）**。
    *   AI的响应通过SSE流式传输，带来流畅、实时的交互体验。

*   **富上下文注入 (Rich Context Injection)**:
    *   **连接云端数据库**: 选择特定的数据库和表，AI将自动理解其Schema，并能为您生成和执行相关的查询代码。
    *   **上传本地知识库**: 上传PDF、TXT等文档，将文档内容作为上下文，让AI基于您提供的资料进行回答。

*   **多工作区管理 (Workspace Management)**:
    *   为不同的项目或研究主题创建独立的工作区。
    *   您的所有对话历史和脑图结构都会被安全地保存在浏览器中，随时可以切换和继续。

*   **交互式探索 (Interactive Exploration)**:
    *   点击画布上的任意节点，即可轻松发起追问，深入挖掘问题的每一个细节。

---

## 🚀 技术栈

*   **前端**:
    *   **框架**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
    *   **语言**: [TypeScript](https://www.typescriptlang.org/)
    *   **UI库**: [Material-UI (MUI)](https://mui.com/)
    *   **可视化/画布**: [React Flow](https://reactflow.dev/)
    *   **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
*   **后端通信**: [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
*   **数据持久化**: 浏览器 `LocalStorage` (用于工作区)

---

## 🛠️ 本地部署与运行 (Getting Started)

请按照以下步骤在本地运行 SynapseAI 前端项目。

### 1. 先决条件

*   [Node.js](https://nodejs.org/) (建议版本 >= 18.0)
*   [pnpm](https://pnpm.io/) (或者 `npm`/`yarn`)

### 2. 安装

1.  **克隆仓库**
    ```bash
    git clone https://github.com/tradercjz/SynapseAI.git
    cd SynapseAI
    ```

2.  **安装依赖**
    ```bash
    pnpm install
    ```

3.  **配置环境变量**
    *   项目中包含一个后端API服务的地址配置。请将 `.env.example` 文件复制为 `.env.local`。
    ```bash
    cp .env.example .env.local
    ```
    *   然后，修改 `.env.local` 文件，填入您本地或远程后端服务的地址：
    ```
    # .env.local
    VITE_API_BASE_URL=http://127.0.0.1:8001/api/v1
    ```

### 3. 运行

1.  **启动开发服务器**
    ```bash
    pnpm dev
    ```
    应用将在 `http://localhost:5173` (或另一个可用端口) 上运行。

2.  **打包生产版本**
    ```bash
    pnpm build
    ```

---

## 📖 如何使用

1.  **登录**: 首次访问需要使用后端配置的用户名和密码进行登录。
2.  **选择上下文 (可选但强大)**:
    *   点击左侧的 **“环境” (Environments)** 图标，展开侧边栏。
    *   **数据库**: 选择一个正在运行的环境，其下方的数据库Schema将会被加载。勾选你希望AI关注的表。
    *   **文件**: 点击 **“用户空间” (User Space)** 图标，拖拽上传您的文档。通过开关将特定文件“关联”到上下文中。
3.  **发起对话**:
    *   使用屏幕底部的 **OmniBar** 输入您的第一个问题，然后按 `Enter`。
4.  **观察AI工作**:
    *   一个新的AI节点将被创建，并开始流式地展示其思考过程和最终答案。
5.  **探索与追问**:
    *   点击任意一个已存在的节点（您的问题或AI的回答），下方会弹出一个输入框。在这里输入您基于该节点的追问。
6.  **管理工作区**:
    *   点击左侧工具栏底部的“工作区”图标，可以创建新的工作区、切换或删除已有的工作区。

---

## 🗺️ 未来路线图 (Roadmap)

我们有很多激动人心的想法来让 SynapseAI 变得更强大：

*   [ ] **与DolphinDB WEB联动**: 导出代码到DolphinDB web编辑器等。
*   [ ] **协同工作**: 支持多用户实时协同编辑同一个脑图。
*   [ ] **更丰富的上下文**: 支持网页链接、代码库等作为上下文源。
*   [ ] **性能优化**: 针对超大规模（1000+节点）脑图的性能优化。


---
