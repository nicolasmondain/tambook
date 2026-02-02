import React from 'react';

export interface ButtonProps {
  /** The button label text */
  label: string;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  /** Size of the button */
  size?: 'small' | 'medium' | 'large';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
}

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
  },
  secondary: {
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
  },
  outline: {
    backgroundColor: 'transparent',
    color: '#3b82f6',
    border: '2px solid #3b82f6',
  },
  danger: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
  },
};

const sizeStyles: Record<string, React.CSSProperties> = {
  small: { padding: '6px 12px', fontSize: '12px' },
  medium: { padding: '10px 20px', fontSize: '14px' },
  large: { padding: '14px 28px', fontSize: '16px' },
};

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
}) => {
  const style: React.CSSProperties = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  };

  return (
    <button style={style} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  );
};
