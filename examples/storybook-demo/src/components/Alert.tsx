import React from 'react';

export interface AlertProps {
  /** Alert title */
  title?: string;
  /** Alert type/severity */
  type?: 'info' | 'success' | 'warning' | 'error';
  /** Whether the alert can be dismissed */
  dismissible?: boolean;
  /** Nested content - can contain text, links, buttons, etc. */
  children?: React.ReactNode;
}

const typeStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  info: {
    bg: '#eff6ff',
    border: '#3b82f6',
    text: '#1e40af',
    icon: 'i',
  },
  success: {
    bg: '#f0fdf4',
    border: '#22c55e',
    text: '#166534',
    icon: '✓',
  },
  warning: {
    bg: '#fffbeb',
    border: '#f59e0b',
    text: '#92400e',
    icon: '!',
  },
  error: {
    bg: '#fef2f2',
    border: '#ef4444',
    text: '#991b1b',
    icon: '✕',
  },
};

export const Alert: React.FC<AlertProps> = ({
  title,
  type = 'info',
  dismissible = false,
  children,
}) => {
  const [visible, setVisible] = React.useState(true);
  const styles = typeStyles[type];

  if (!visible) return null;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: styles.bg,
    borderLeft: `4px solid ${styles.border}`,
    borderRadius: '4px',
  };

  const iconStyle: React.CSSProperties = {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: styles.border,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
  };

  const titleStyle: React.CSSProperties = {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: styles.text,
  };

  const bodyStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '14px',
    color: styles.text,
    lineHeight: 1.5,
  };

  const closeStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: styles.text,
    padding: '0',
    lineHeight: 1,
  };

  return (
    <div style={containerStyle}>
      <span style={iconStyle}>{styles.icon}</span>
      <div style={contentStyle}>
        {title && <h4 style={titleStyle}>{title}</h4>}
        <div style={bodyStyle}>{children}</div>
      </div>
      {dismissible && (
        <button style={closeStyle} onClick={() => setVisible(false)}>
          ×
        </button>
      )}
    </div>
  );
};
