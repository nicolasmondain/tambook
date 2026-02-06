import React from 'react';

export interface BoxProps {
  /** Padding size */
  padding?: 'none' | 'small' | 'medium' | 'large';
  /** Margin size */
  margin?: 'none' | 'small' | 'medium' | 'large';
  /** Background color */
  bg?: 'transparent' | 'white' | 'gray' | 'primary' | 'success' | 'warning' | 'danger';
  /** Border style */
  border?: 'none' | 'thin' | 'medium' | 'thick';
  /** Border radius */
  radius?: 'none' | 'small' | 'medium' | 'large' | 'full';
  /** Nested content */
  children?: React.ReactNode;
}

const spacingValues: Record<string, string> = {
  none: '0',
  small: '8px',
  medium: '16px',
  large: '24px',
};

const bgColors: Record<string, string> = {
  transparent: 'transparent',
  white: '#ffffff',
  gray: '#f3f4f6',
  primary: '#dbeafe',
  success: '#d1fae5',
  warning: '#fef3c7',
  danger: '#fee2e2',
};

const borderWidths: Record<string, string> = {
  none: '0',
  thin: '1px solid #e5e7eb',
  medium: '2px solid #e5e7eb',
  thick: '4px solid #e5e7eb',
};

const radiusValues: Record<string, string> = {
  none: '0',
  small: '4px',
  medium: '8px',
  large: '16px',
  full: '9999px',
};

export const Box: React.FC<BoxProps> = ({
  padding = 'medium',
  margin = 'none',
  bg = 'transparent',
  border = 'none',
  radius = 'none',
  children,
}) => {
  const style: React.CSSProperties = {
    padding: spacingValues[padding],
    margin: spacingValues[margin],
    backgroundColor: bgColors[bg],
    border: borderWidths[border],
    borderRadius: radiusValues[radius],
  };

  return <div style={style}>{children}</div>;
};
