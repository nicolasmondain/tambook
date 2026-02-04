import React, { useRef, useEffect } from 'react';
import { styled, keyframes } from 'storybook/internal/theming';
import type { ChatMessage } from '../types';
import { ComponentPreview } from './ComponentPreview';

interface MessageListProps {
  messages: ChatMessage[];
  isGenerating: boolean;
  onCopyProps: (props: Record<string, unknown>) => void;
  appliedPropsMessageIds: Set<string>;
}

const Container = styled.div({
  flex: 1,
  overflowY: 'auto',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

const MessageBubble = styled.div<{ role: 'user' | 'assistant' }>(
  ({ theme, role }) => ({
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '13px',
    lineHeight: 1.5,
    wordBreak: 'break-word',
    alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
    backgroundColor:
      role === 'user' ? theme.color.secondary : theme.background.hoverable,
    color: role === 'user' ? theme.color.lightest : theme.color.defaultText,
  })
);

const MessageContent = styled.div({
  whiteSpace: 'pre-wrap',
});

const GeneratedComponentContainer = styled.div(({ theme }) => ({
  marginTop: '10px',
  paddingTop: '10px',
  borderTop: `1px solid ${theme.appBorderColor}`,
}));

const pulse = keyframes`
  0%, 80%, 100% {
    opacity: 0.4;
  }
  40% {
    opacity: 1;
  }
`;

const LoadingIndicator = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '10px 14px',
  alignSelf: 'flex-start',
  backgroundColor: theme.background.hoverable,
  borderRadius: '12px',
}));

const LoadingDot = styled.span<{ delay: number }>(({ theme, delay }) => ({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: theme.color.mediumdark,
  animation: `${pulse} 1.4s infinite ease-in-out`,
  animationDelay: `${delay}s`,
}));

/**
 * Displays the list of chat messages with component previews
 */
export function MessageList({
  messages,
  isGenerating,
  onCopyProps,
  appliedPropsMessageIds,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  return (
    <Container ref={containerRef}>
      {messages.map((message) => (
        <MessageBubble key={message.id} role={message.role}>
          <MessageContent>{message.content}</MessageContent>

          {message.generatedComponent && (
            <GeneratedComponentContainer>
              <ComponentPreview
                component={message.generatedComponent}
                onCopyProps={onCopyProps}
                propsApplied={appliedPropsMessageIds.has(message.id)}
              />
            </GeneratedComponentContainer>
          )}
        </MessageBubble>
      ))}

      {isGenerating && (
        <LoadingIndicator>
          <LoadingDot delay={0} />
          <LoadingDot delay={0.2} />
          <LoadingDot delay={0.4} />
        </LoadingIndicator>
      )}
    </Container>
  );
}
