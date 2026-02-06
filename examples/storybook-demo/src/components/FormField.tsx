import React from 'react';

export interface FormFieldProps {
  /** Field label */
  label: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message (displays in red) */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Nested input component (Input, Select, etc.) */
  children?: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  helperText,
  error,
  required = false,
  children,
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const requiredStyle: React.CSSProperties = {
    color: '#ef4444',
  };

  const helperStyle: React.CSSProperties = {
    fontSize: '12px',
    color: error ? '#ef4444' : '#6b7280',
    margin: 0,
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>
        {label}
        {required && <span style={requiredStyle}>*</span>}
      </label>
      {children}
      {(helperText || error) && (
        <p style={helperStyle}>{error || helperText}</p>
      )}
    </div>
  );
};
