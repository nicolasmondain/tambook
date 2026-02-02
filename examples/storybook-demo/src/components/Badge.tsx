import React from 'react';

export interface BadgeProps {
  /** Badge text */
  text: string;
  /** Color variant */
  color?: 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';
  /** Size variant */
  size?: 'small' | 'medium';
}

const colorStyles: Record<string, React.CSSProperties> = {
  gray: { backgroundColor: '#f3f4f6', color: '#374151' },
  red: { backgroundColor: '#fee2e2', color: '#991b1b' },
  yellow: { backgroundColor: '#fef3c7', color: '#92400e' },
  green: { backgroundColor: '#d1fae5', color: '#065f46' },
  blue: { backgroundColor: '#dbeafe', color: '#1e40af' },
  purple: { backgroundColor: '#e9d5ff', color: '#6b21a8' },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  small: { padding: '2px 8px', fontSize: '10px' },
  medium: { padding: '4px 12px', fontSize: '12px' },
};

export const Badge: React.FC<BadgeProps> = ({
  text,
  color = 'gray',
  size = 'medium',
}) => {
  const style: React.CSSProperties = {
    ...colorStyles[color],
    ...sizeStyles[size],
    display: 'inline-block',
    borderRadius: '9999px',
    fontWeight: 500,
  };

  return <span style={style}>{text}</span>;
};
