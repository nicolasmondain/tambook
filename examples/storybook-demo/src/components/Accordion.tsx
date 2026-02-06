import React from 'react';

export interface AccordionProps {
  /** Accordion header title */
  title: string;
  /** Whether the accordion is expanded by default */
  defaultExpanded?: boolean;
  /** Visual variant */
  variant?: 'default' | 'bordered' | 'separated';
  /** Nested content - revealed when expanded */
  children?: React.ReactNode;
}

const variantStyles: Record<string, { container: React.CSSProperties; header: React.CSSProperties }> = {
  default: {
    container: { borderBottom: '1px solid #e5e7eb' },
    header: { backgroundColor: 'transparent' },
  },
  bordered: {
    container: { border: '1px solid #e5e7eb', borderRadius: '8px' },
    header: { backgroundColor: '#f9fafb', borderRadius: '8px 8px 0 0' },
  },
  separated: {
    container: { backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '8px' },
    header: { backgroundColor: 'transparent' },
  },
};

export const Accordion: React.FC<AccordionProps> = ({
  title,
  defaultExpanded = false,
  variant = 'default',
  children,
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const styles = variantStyles[variant];

  const containerStyle: React.CSSProperties = {
    ...styles.container,
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    ...styles.header,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  };

  const iconStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    transition: 'transform 0.2s ease',
    transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
  };

  const contentStyle: React.CSSProperties = {
    padding: expanded ? '0 16px 16px 16px' : '0 16px',
    maxHeight: expanded ? '500px' : '0',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle} onClick={() => setExpanded(!expanded)}>
        <h3 style={titleStyle}>{title}</h3>
        <span style={iconStyle}>▼</span>
      </div>
      <div style={contentStyle}>{children}</div>
    </div>
  );
};
