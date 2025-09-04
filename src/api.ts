// src/api.ts
import { v4 as uuidv4 } from 'uuid';
import type { Node, Edge } from 'reactflow';
import type { NodeData } from './types';

// This function now simulates a text-based response from an AI
export const mockAIResponseAPI = (
  sourceNode: Node<NodeData>,
  prompt: string
): Promise<{ newNode: Node<NodeData>; newConnector: Edge }> => {
  console.log(`AI Task Started for node ${sourceNode.id}. Prompt: "${prompt}"`);

  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate a text-based answer from the AI
      const aiResponseContent = `Based on your query about "${prompt}", here are the key considerations:\n\n1. Core Concept: Define the central theme clearly.\n2. Target Audience: Who are you trying to reach?\n3. Uniqueness: What makes your idea stand out from the rest?`;

      const newNodeId = uuidv4();
      
      // We need a dummy function for the new node, it will be replaced in the main component
      const dummyOnAgentClick = () => {};

      const newNode: Node<NodeData> = {
        id: newNodeId,
        type: 'custom',
        position: { x: 0, y: 0 }, // Position will be calculated in FlowCanvas
        data: {
          id: newNodeId,
          label: `Response to: "${prompt.substring(0, 20)}..."`, // Truncate long prompts for the label
          content: aiResponseContent,
          onAgentClick: dummyOnAgentClick,
        },
      };

      const newConnector: Edge = {
        id: `e-${sourceNode.id}-${newNodeId}`,
        source: sourceNode.id,
        target: newNodeId,
        animated: true,
      };

      console.log('AI Task Completed. Returning a new response node.');
      resolve({ newNode, newConnector });
    }, 1500);
  });
};