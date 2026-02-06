import React from 'react';

export interface TextProps {
  /** Text content to display */
  content: string;
  /** Typography variant */
  variant?: 'body' | 'caption' | 'label' | 'lead';
  /** Text color */
  color?: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';
  /** Font weight */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

const variantStyles: Record<string, React.CSSProperties> = {
  body: { fontSize: '14px', lineHeight: 1.5 },
  caption: { fontSize: '12px', lineHeight: 1.4 },
  label: { fontSize: '13px', lineHeight: 1.4, textTransform: 'uppercase', letterSpacing: '0.5px' },
  lead: { fontSize: '18px', lineHeight: 1.6 },
};

const colorValues: Record<string, string> = {
  default: '#111827',
  muted: '#6b7280',
  primary: '#3b82f6',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
};

const weightValues: Record<string, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const Text: React.FC<TextProps> = ({
  content,
  variant = 'body',
  color = 'default',
  weight = 'normal',
  align = 'left',
}) => {
  const style: React.CSSProperties = {
    ...variantStyles[variant],
    color: colorValues[color],
    fontWeight: weightValues[weight],
    textAlign: align,
    margin: 0,
  };

  return <p style={style}>{content}</p>;
};
