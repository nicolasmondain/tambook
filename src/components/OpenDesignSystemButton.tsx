import React from 'react';
import { addons } from 'storybook/internal/preview-api';
import { EVENTS } from '../constants';

interface OpenDesignSystemButtonProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Button component that opens the Design System Chat page.
 * Use this in MDX docs or stories to provide an entry point to the design system chat.
 */
export function OpenDesignSystemButton({
  children = 'Open Design System Chat',
  style,
}: OpenDesignSystemButtonProps) {
  const handleClick = () => {
    const channel = addons.getChannel();
    channel.emit(EVENTS.OPEN_DESIGN_SYSTEM);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: 600,
        color: '#fff',
        backgroundColor: '#029CFD',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
