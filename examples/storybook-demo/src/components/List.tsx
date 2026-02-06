import React from 'react';

export interface ListProps {
  /** List visual variant */
  variant?: 'default' | 'bordered' | 'separated';
  /** List item spacing */
  spacing?: 'compact' | 'normal' | 'relaxed';
  /** Nested ListItem components */
  children?: React.ReactNode;
}

export interface ListItemProps {
  /** Icon or bullet character */
  icon?: string;
  /** Primary text */
  primary?: string;
  /** Secondary text */
  secondary?: string;
  /** Nested content - can contain badges, buttons, etc. */
  children?: React.ReactNode;
}

const spacingValues: Record<string, string> = {
  compact: '8px',
  normal: '12px',
  relaxed: '16px',
};

export const List: React.FC<ListProps> = ({
  variant = 'default',
  spacing = 'normal',
  children,
}) => {
  const containerStyle: React.CSSProperties = {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    ...(variant === 'bordered' && {
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
    }),
  };

  // Clone children to pass spacing and variant
  const items = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      const isLast = index === React.Children.count(children) - 1;
      return React.cloneElement(child as React.ReactElement<ListItemInternalProps>, {
        _spacing: spacing,
        _variant: variant,
        _isLast: isLast,
      });
    }
    return child;
  });

  return <ul style={containerStyle}>{items}</ul>;
};

interface ListItemInternalProps extends ListItemProps {
  _spacing?: 'compact' | 'normal' | 'relaxed';
  _variant?: 'default' | 'bordered' | 'separated';
  _isLast?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  icon,
  primary,
  secondary,
  children,
  ...props
}) => {
  const { _spacing = 'normal', _variant = 'default', _isLast = false } = props as ListItemInternalProps;

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: spacingValues[_spacing],
    ...(_variant === 'bordered' && !_isLast && {
      borderBottom: '1px solid #e5e7eb',
    }),
    ...(_variant === 'separated' && {
      backgroundColor: '#f9fafb',
      borderRadius: '6px',
      marginBottom: _isLast ? 0 : '8px',
    }),
  };

  const iconStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#6b7280',
    flexShrink: 0,
    marginTop: '2px',
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const primaryStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  };

  const secondaryStyle: React.CSSProperties = {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#6b7280',
  };

  const childrenStyle: React.CSSProperties = {
    marginTop: primary || secondary ? '8px' : 0,
  };

  return (
    <li style={itemStyle}>
      {icon && <span style={iconStyle}>{icon}</span>}
      <div style={contentStyle}>
        {primary && <p style={primaryStyle}>{primary}</p>}
        {secondary && <p style={secondaryStyle}>{secondary}</p>}
        {children && <div style={childrenStyle}>{children}</div>}
      </div>
    </li>
  );
};
