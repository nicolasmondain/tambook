import React from 'react';

export interface CardProps {
  /** Card title */
  title: string;
  /** Card description or body text */
  description?: string;
  /** Image URL to display at the top */
  imageUrl?: string;
  /** Visual variant */
  variant?: 'default' | 'outlined' | 'elevated';
  /** Footer content */
  footer?: string;
}

const variantStyles: Record<string, React.CSSProperties> = {
  default: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    boxShadow: 'none',
  },
  outlined: {
    backgroundColor: 'transparent',
    border: '2px solid #3b82f6',
    boxShadow: 'none',
  },
  elevated: {
    backgroundColor: '#ffffff',
    border: 'none',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
};

export const Card: React.FC<CardProps> = ({
  title,
  description,
  imageUrl,
  variant = 'default',
  footer,
}) => {
  const containerStyle: React.CSSProperties = {
    ...variantStyles[variant],
    borderRadius: '8px',
    overflow: 'hidden',
    maxWidth: '320px',
  };

  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
  };

  const contentStyle: React.CSSProperties = {
    padding: '16px',
  };

  const titleStyle: React.CSSProperties = {
    margin: '0 0 8px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  };

  const descriptionStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
  };

  const footerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderTop: '1px solid #e5e7eb',
    fontSize: '12px',
    color: '#9ca3af',
  };

  return (
    <div style={containerStyle}>
      {imageUrl && <img src={imageUrl} alt={title} style={imageStyle} />}
      <div style={contentStyle}>
        <h3 style={titleStyle}>{title}</h3>
        {description && <p style={descriptionStyle}>{description}</p>}
      </div>
      {footer && <div style={footerStyle}>{footer}</div>}
    </div>
  );
};
