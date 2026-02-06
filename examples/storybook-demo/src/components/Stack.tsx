import React from 'react';

export interface StackProps {
  /** Direction of the stack */
  direction?: 'vertical' | 'horizontal';
  /** Gap between items */
  gap?: 'none' | 'small' | 'medium' | 'large';
  /** Alignment of items */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  /** Whether to wrap items */
  wrap?: boolean;
  /** Nested content - can contain any components */
  children?: React.ReactNode;
}

const gapValues: Record<string, string> = {
  none: '0',
  small: '8px',
  medium: '16px',
  large: '24px',
};

const alignValues: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const justifyValues: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

export const Stack: React.FC<StackProps> = ({
  direction = 'vertical',
  gap = 'medium',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  children,
}) => {
  const style: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'vertical' ? 'column' : 'row',
    gap: gapValues[gap],
    alignItems: alignValues[align],
    justifyContent: justifyValues[justify],
    flexWrap: wrap ? 'wrap' : 'nowrap',
  };

  return <div style={style}>{children}</div>;
};
