import React, { useState, useCallback, KeyboardEvent } from 'react';
import { styled } from 'storybook/internal/theming';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const InputContainer = styled.div(({ theme }) => ({
  display: 'flex',
  gap: '8px',
  padding: '12px',
  borderTop: `1px solid ${theme.appBorderColor}`,
  backgroundColor: theme.background.bar,
}));

const TextInput = styled.textarea<{ disabled?: boolean }>(({ theme, disabled }) => ({
  flex: 1,
  padding: '8px 12px',
  fontSize: '13px',
  lineHeight: 1.4,
  color: theme.color.defaultText,
  backgroundColor: disabled ? theme.background.hoverable : theme.background.app,
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: '6px',
  resize: 'none',
  minHeight: '40px',
  maxHeight: '120px',
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  '&:focus': {
    borderColor: theme.color.secondary,
    boxShadow: `0 0 0 1px ${theme.color.secondary}`,
  },
  '&::placeholder': {
    color: theme.color.mediumdark,
  },
  '&:disabled': {
    cursor: 'not-allowed',
    opacity: 0.6,
  },
}));

const SendButton = styled.button<{ disabled?: boolean }>(({ theme, disabled }) => ({
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 500,
  color: disabled ? theme.color.mediumdark : theme.color.lightest,
  backgroundColor: disabled ? theme.background.hoverable : theme.color.secondary,
  border: 'none',
  borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
  alignSelf: 'flex-end',
  '&:hover:not(:disabled)': {
    backgroundColor: theme.color.secondary,
    filter: 'brightness(1.1)',
    transform: 'translateY(-1px)',
  },
  '&:active:not(:disabled)': {
    transform: 'translateY(0)',
  },
}));

/**
 * Chat input component for sending messages to the AI
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Describe a component to generate...',
}: ChatInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue('');
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(event.target.value);
    },
    []
  );

  return (
    <InputContainer>
      <TextInput
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
      />
      <SendButton onClick={handleSubmit} disabled={disabled || !value.trim()}>
        {disabled ? 'Generating...' : 'Send'}
      </SendButton>
    </InputContainer>
  );
}
