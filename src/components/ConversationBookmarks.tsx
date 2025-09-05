// src/components/ConversationBookmarks.tsx
import React, { useMemo, useState } from 'react';
import { Box, Paper, Typography, Tooltip } from '@mui/material';
import { SubdirectoryArrowRight as StartIcon } from '@mui/icons-material';
import { useReactFlow, Node, Edge } from 'reactflow';
import { NodeData } from '../types';

interface ConversationBookmarksProps {
    nodes: Node<NodeData>[];
    edges: Edge[];
}

const ConversationBookmarks: React.FC<ConversationBookmarksProps> = ({ nodes, edges }) => {
    const { fitView } = useReactFlow();
    const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 1. 使用 useMemo 优化性能，只有在节点或边变化时才重新计算起始节点
    const startingNodes = useMemo(() => {
        const targetNodeIds = new Set(edges.map(edge => edge.target));
        return nodes.filter(
            node => node.data.nodeType === 'USER_QUERY' && !targetNodeIds.has(node.id)
        );
    }, [nodes, edges]);

    if (startingNodes.length === 0) {
        return null; // 如果没有起始节点，则不渲染任何内容
    }

  // 2. 点击书签时的处理函数
    const handleBookmarkClick = (nodeId: string) => {
        fitView({
            nodes: [{ id: nodeId }],
            duration: 600, // 动画时长
            padding: 0.3,   // 聚焦后的内边距
        });
    };

    return (
    <Box
        sx={{
            position: 'absolute',
            top: '50%',
            right: 0,
            transform: 'translateY(-50%)',
            zIndex: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
        }}
    >
    {startingNodes.map(node => (
        <Tooltip key={node.id} title="Click to focus" placement="left">
          <Paper
            elevation={4}
            onMouseEnter={() => setHoveredId(node.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => handleBookmarkClick(node.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '8px 12px',
              // 3. 核心动画逻辑
              transform: hoveredId === node.id ? 'translateX(0)' : 'translateX(calc(100% - 40px))',
              transition: 'transform 0.3s ease-in-out',
              borderTopLeftRadius: '12px',
              borderBottomLeftRadius: '12px',
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            <StartIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="body2" noWrap>
              {node.data.label}
            </Typography>
          </Paper>
        </Tooltip>
      ))}
    </Box>
  );
};

export default ConversationBookmarks;