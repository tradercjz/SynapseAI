// src/App.tsx
import { ReactFlowProvider } from 'reactflow';
import FlowCanvas from './FlowCanvas';
import './styles.css';

function App() {
  return (
    <div className="app-container">
      <ReactFlowProvider>
        <FlowCanvas />
      </ReactFlowProvider>
    </div>
  );
}

export default App;