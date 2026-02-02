import React from 'react';

export interface InputProps {
  /** Placeholder text */
  placeholder?: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** Label text displayed above the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message (displays in red) */
  error?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether the input is required */
  required?: boolean;
  /** Current value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
}

export const Input: React.FC<InputProps> = ({
  placeholder,
  type = 'text',
  label,
  helperText,
  error,
  disabled = false,
  required = false,
  value,
  onChange,
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '300px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '14px',
    border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: disabled ? '#f3f4f6' : '#ffffff',
    cursor: disabled ? 'not-allowed' : 'text',
  };

  const helperStyle: React.CSSProperties = {
    fontSize: '12px',
    color: error ? '#ef4444' : '#6b7280',
    margin: 0,
  };

  return (
    <div style={containerStyle}>
      {label && (
        <label style={labelStyle}>
          {label}
          {required && <span style={{ color: '#ef4444' }}> *</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={inputStyle}
      />
      {(helperText || error) && (
        <p style={helperStyle}>{error || helperText}</p>
      )}
    </div>
  );
};
