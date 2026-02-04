import React, { useState, useCallback, useEffect } from 'react';
import { useChannel } from 'storybook/internal/manager-api';
import { styled } from 'storybook/internal/theming';
import { EVENTS } from '../constants';
import { DesignSystemPage } from './DesignSystemPage';

// Floating button - always visible in bottom-left corner of sidebar
const FloatingButton = styled.button(({ theme }) => ({
  position: 'fixed',
  bottom: '20px',
  left: '20px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 20px',
  fontSize: '14px',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: theme.color.secondary || '#029CFD',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  zIndex: 9998,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
  },
}));

// Full-screen overlay for the Design System page
const Overlay = styled.div<{ isOpen: boolean }>(({ isOpen }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '#fff',
  zIndex: 9999,
  display: isOpen ? 'flex' : 'none',
  flexDirection: 'column',
}));

const CloseButton = styled.button(({ theme }) => ({
  position: 'absolute',
  top: '16px',
  right: '24px',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  color: theme.color.defaultText,
  backgroundColor: theme.background.hoverable,
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: '4px',
  cursor: 'pointer',
  zIndex: 10000,
  '&:hover': {
    backgroundColor: theme.background.content,
  },
}));

// Grid icon
const GridIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="currentColor"
  >
    <path d="M4 4h6v6H4V4zm0 10h6v6H4v-6zm10-10h6v6h-6V4zm0 10h6v6h-6v-6z" />
  </svg>
);

/**
 * Floating button that opens the Design System page
 * Always visible in the bottom-left corner
 */
export function DesignSystemTool() {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Listen for channel event to open (from MDX page or other sources)
  useChannel({
    [EVENTS.OPEN_DESIGN_SYSTEM]: () => {
      setIsOpen(true);
    },
  });

  return (
    <>
      {!isOpen && (
        <FloatingButton onClick={handleOpen} title="Open Design System Chat (all components)">
          <GridIcon />
          Design System
        </FloatingButton>
      )}

      <Overlay isOpen={isOpen}>
        <CloseButton onClick={handleClose}>
          Close (Esc)
        </CloseButton>
        {isOpen && <DesignSystemPage />}
      </Overlay>
    </>
  );
}
