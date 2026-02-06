import React from 'react';

export interface DividerProps {
  /** Orientation of the divider */
  orientation?: 'horizontal' | 'vertical';
  /** Visual variant */
  variant?: 'solid' | 'dashed' | 'dotted';
  /** Color variant */
  color?: 'light' | 'medium' | 'dark';
  /** Spacing around the divider */
  spacing?: 'none' | 'small' | 'medium' | 'large';
  /** Optional label text in the middle */
  label?: string;
}

const colorValues: Record<string, string> = {
  light: '#f3f4f6',
  medium: '#e5e7eb',
  dark: '#d1d5db',
};

const spacingValues: Record<string, string> = {
  none: '0',
  small: '8px',
  medium: '16px',
  large: '24px',
};

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  color = 'medium',
  spacing = 'medium',
  label,
}) => {
  const isHorizontal = orientation === 'horizontal';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    ...(isHorizontal
      ? { width: '100%', margin: `${spacingValues[spacing]} 0` }
      : { height: '100%', flexDirection: 'column', margin: `0 ${spacingValues[spacing]}` }),
  };

  const lineStyle: React.CSSProperties = {
    flex: 1,
    ...(isHorizontal
      ? {
          height: '1px',
          borderTop: `1px ${variant} ${colorValues[color]}`,
        }
      : {
          width: '1px',
          borderLeft: `1px ${variant} ${colorValues[color]}`,
        }),
  };

  const labelStyle: React.CSSProperties = {
    padding: isHorizontal ? '0 12px' : '12px 0',
    fontSize: '12px',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  };

  if (label) {
    return (
      <div style={containerStyle}>
        <div style={lineStyle} />
        <span style={labelStyle}>{label}</span>
        <div style={lineStyle} />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={lineStyle} />
    </div>
  );
};
