// src/OmniBar.tsx
import React, { useState } from 'react';

interface OmniBarProps {
  onCreateNode: (label: string) => void;
}

export default function OmniBar({ onCreateNode }: OmniBarProps) {
  const [value, setValue] = useState<string>('');

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && value.trim() !== '') {
      onCreateNode(value.trim());
      setValue('');
    }
  };

  return (
    <div className="omni-bar-container">
      <input
        type="text"
        className="omni-bar-input"
        placeholder="Type an idea and press Enter..."
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
