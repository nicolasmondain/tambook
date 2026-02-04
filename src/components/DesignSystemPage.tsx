import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useChannel, useStorybookApi } from 'storybook/internal/manager-api';
import { ADDON_ID, EVENTS } from '../constants';
import { styled } from 'storybook/internal/theming';

/**
 * Message structure for the chat
 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  generatedComponent?: {
    componentName: string;
    props: Record<string, unknown>;
  };
}

/**
 * Thread state from preview
 */
interface ThreadState {
  messages: ChatMessage[];
  isGenerating: boolean;
  error?: string;
}

interface PreparationProgress {
  loaded: number;
  total: number;
}

// Styled components
const PageContainer = styled.div({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  overflow: 'hidden',
  backgroundColor: '#fff',
});

const Header = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 24px',
  borderBottom: `1px solid ${theme.appBorderColor}`,
  backgroundColor: theme.background.bar,
}));

const Title = styled.h1(({ theme }) => ({
  margin: 0,
  fontSize: '20px',
  fontWeight: 600,
  color: theme.color.defaultText,
}));

const Subtitle = styled.span(({ theme }) => ({
  fontSize: '13px',
  color: theme.color.mediumdark,
  marginLeft: '12px',
}));

const ClearButton = styled.button(({ theme }) => ({
  padding: '8px 16px',
  fontSize: '13px',
  color: theme.color.mediumdark,
  backgroundColor: 'transparent',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: theme.background.hoverable,
    color: theme.color.defaultText,
  },
}));

const MainContent = styled.div({
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
});

const ChatSection = styled.div({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const ComponentsSidebar = styled.div(({ theme }) => ({
  width: '280px',
  borderLeft: `1px solid ${theme.appBorderColor}`,
  padding: '16px',
  overflowY: 'auto',
  backgroundColor: theme.background.content,
}));

const SidebarTitle = styled.h3(({ theme }) => ({
  margin: '0 0 12px 0',
  fontSize: '13px',
  fontWeight: 600,
  color: theme.color.defaultText,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const ComponentCard = styled.div(({ theme }) => ({
  padding: '12px',
  marginBottom: '8px',
  backgroundColor: theme.background.app,
  borderRadius: '6px',
  border: `1px solid ${theme.appBorderColor}`,
}));

const ComponentName = styled.div(({ theme }) => ({
  fontSize: '13px',
  fontWeight: 600,
  color: theme.color.defaultText,
  marginBottom: '4px',
}));

const ComponentDescription = styled.div(({ theme }) => ({
  fontSize: '11px',
  color: theme.color.mediumdark,
  lineHeight: 1.4,
}));

const MessagesContainer = styled.div({
  flex: 1,
  overflowY: 'auto',
  padding: '24px',
});

const MessageBubble = styled.div<{ isUser: boolean }>(({ theme, isUser }) => ({
  maxWidth: '70%',
  marginBottom: '16px',
  padding: '12px 16px',
  borderRadius: '12px',
  marginLeft: isUser ? 'auto' : '0',
  marginRight: isUser ? '0' : 'auto',
  backgroundColor: isUser ? theme.color.secondary : theme.background.hoverable,
  color: isUser ? '#fff' : theme.color.defaultText,
  fontSize: '14px',
  lineHeight: 1.5,
}));

const GeneratedComponentBox = styled.div(({ theme }) => ({
  marginTop: '12px',
  padding: '12px',
  backgroundColor: theme.background.app,
  borderRadius: '6px',
  border: `1px solid ${theme.appBorderColor}`,
}));

const ComponentTag = styled.span(({ theme }) => ({
  display: 'inline-block',
  padding: '2px 8px',
  fontSize: '11px',
  fontWeight: 600,
  color: theme.color.secondary,
  backgroundColor: `${theme.color.secondary}20`,
  borderRadius: '4px',
  marginBottom: '8px',
}));

const PropsDisplay = styled.pre(({ theme }) => ({
  margin: 0,
  fontSize: '11px',
  color: theme.color.mediumdark,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}));

const InputArea = styled.div(({ theme }) => ({
  padding: '16px 24px',
  borderTop: `1px solid ${theme.appBorderColor}`,
  backgroundColor: theme.background.bar,
}));

const InputWrapper = styled.div({
  display: 'flex',
  gap: '12px',
});

const TextInput = styled.textarea(({ theme }) => ({
  flex: 1,
  padding: '12px 16px',
  fontSize: '14px',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: '8px',
  resize: 'none',
  minHeight: '48px',
  maxHeight: '120px',
  fontFamily: 'inherit',
  '&:focus': {
    outline: 'none',
    borderColor: theme.color.secondary,
  },
  '&:disabled': {
    backgroundColor: theme.background.hoverable,
    cursor: 'not-allowed',
  },
}));

const SendButton = styled.button<{ disabled?: boolean }>(({ theme, disabled }) => ({
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: disabled ? theme.color.mediumdark : theme.color.secondary,
  border: 'none',
  borderRadius: '8px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: disabled ? theme.color.mediumdark : theme.color.secondaryText,
  },
}));

const LoadingBar = styled.div(({ theme }) => ({
  padding: '12px 24px',
  backgroundColor: theme.background.hoverable,
  borderBottom: `1px solid ${theme.appBorderColor}`,
  fontSize: '13px',
  color: theme.color.mediumdark,
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}));

const ProgressBarContainer = styled.div(({ theme }) => ({
  flex: 1,
  height: '6px',
  backgroundColor: theme.appBorderColor,
  borderRadius: '3px',
  overflow: 'hidden',
}));

const ProgressBarFill = styled.div<{ progress: number }>(({ theme, progress }) => ({
  height: '100%',
  width: `${progress}%`,
  backgroundColor: theme.color.secondary,
  borderRadius: '3px',
  transition: 'width 0.2s ease',
}));

const EmptyState = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  padding: '48px',
  textAlign: 'center',
  color: theme.color.mediumdark,
}));

const EmptyStateTitle = styled.h2(({ theme }) => ({
  margin: '0 0 12px 0',
  fontSize: '18px',
  fontWeight: 600,
  color: theme.color.defaultText,
}));

const EmptyStateText = styled.p({
  margin: 0,
  fontSize: '14px',
  lineHeight: 1.6,
  maxWidth: '400px',
});

const TypingIndicator = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '12px 16px',
  marginBottom: '16px',
  maxWidth: '100px',
  borderRadius: '12px',
  backgroundColor: theme.background.hoverable,
  '& span': {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: theme.color.mediumdark,
    animation: 'typing 1.4s infinite',
    '&:nth-child(2)': { animationDelay: '0.2s' },
    '&:nth-child(3)': { animationDelay: '0.4s' },
  },
  '@keyframes typing': {
    '0%, 60%, 100%': { transform: 'translateY(0)' },
    '30%': { transform: 'translateY(-4px)' },
  },
}));

/**
 * Design System Page - Full design system chat interface
 */
export function DesignSystemPage() {
  const api = useStorybookApi();
  const [threadState, setThreadState] = useState<ThreadState>({
    messages: [],
    isGenerating: false,
  });
  const [registeredComponents, setRegisteredComponents] = useState<string[]>([]);
  const [preparationProgress, setPreparationProgress] = useState<PreparationProgress | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadState.messages, threadState.isGenerating]);

  const emit = useChannel({
    // Listen for design system thread updates (separate from story panel)
    [EVENTS.DS_THREAD_UPDATE]: (payload: { state: ThreadState }) => {
      setThreadState(payload.state);
    },
    [EVENTS.COMPONENTS_REGISTERED]: (payload: { componentNames: string[] }) => {
      setRegisteredComponents(payload.componentNames);
    },
    [EVENTS.PREPARATION_PROGRESS]: (payload: PreparationProgress) => {
      setPreparationProgress(payload);
    },
    [EVENTS.ALL_COMPONENTS_READY]: (payload: { components: string[] }) => {
      setPreparationProgress(null);
      setRegisteredComponents(payload.components);
    },
  });

  // Request current component list on mount (in case we missed the initial ALL_COMPONENTS_READY event)
  useEffect(() => {
    emit(EVENTS.REQUEST_COMPONENTS);
  }, [emit]);

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || threadState.isGenerating) return;
    // Use design system specific message event
    emit(EVENTS.SEND_DS_MESSAGE, { content: inputValue.trim() });
    setInputValue('');
  }, [emit, inputValue, threadState.isGenerating]);

  const handleClearThread = useCallback(() => {
    // Use design system specific clear event
    emit(EVENTS.CLEAR_DS_THREAD);
    setThreadState({ messages: [], isGenerating: false });
  }, [emit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasMessages = threadState.messages.length > 0;
  const isReady = registeredComponents.length > 0 && !preparationProgress;

  return (
    <PageContainer>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title>Design System Chat</Title>
          <Subtitle>
            {registeredComponents.length} components available
          </Subtitle>
        </div>
        {hasMessages && (
          <ClearButton onClick={handleClearThread}>Clear Chat</ClearButton>
        )}
      </Header>

      {preparationProgress && (
        <LoadingBar>
          <span>
            Loading design system... {preparationProgress.loaded}/{preparationProgress.total}
          </span>
          <ProgressBarContainer>
            <ProgressBarFill
              progress={
                preparationProgress.total > 0
                  ? (preparationProgress.loaded / preparationProgress.total) * 100
                  : 0
              }
            />
          </ProgressBarContainer>
        </LoadingBar>
      )}

      <MainContent>
        <ChatSection>
          <MessagesContainer>
            {hasMessages ? (
              <>
                {threadState.messages.map((msg) => (
                  <MessageBubble key={msg.id} isUser={msg.role === 'user'}>
                    {msg.content}
                    {msg.generatedComponent && (
                      <GeneratedComponentBox>
                        <ComponentTag>{msg.generatedComponent.componentName}</ComponentTag>
                        <PropsDisplay>
                          {JSON.stringify(msg.generatedComponent.props, null, 2)}
                        </PropsDisplay>
                      </GeneratedComponentBox>
                    )}
                  </MessageBubble>
                ))}
                {threadState.isGenerating && (
                  <TypingIndicator>
                    <span />
                    <span />
                    <span />
                  </TypingIndicator>
                )}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <EmptyState>
                <EmptyStateTitle>Design System Assistant</EmptyStateTitle>
                <EmptyStateText>
                  Chat with your entire design system. Describe the UI you want to build
                  and I'll help you compose components together. You can mix and match
                  any of the {registeredComponents.length} available components.
                </EmptyStateText>
              </EmptyState>
            )}
          </MessagesContainer>

          <InputArea>
            <InputWrapper>
              <TextInput
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isReady
                    ? 'Describe the UI you want to build... (e.g., "Create a Card with a title, description, and two buttons")'
                    : 'Loading components...'
                }
                disabled={!isReady || threadState.isGenerating}
                rows={1}
              />
              <SendButton
                onClick={handleSendMessage}
                disabled={!isReady || threadState.isGenerating || !inputValue.trim()}
              >
                Send
              </SendButton>
            </InputWrapper>
          </InputArea>
        </ChatSection>

        <ComponentsSidebar>
          <SidebarTitle>Available Components</SidebarTitle>
          {registeredComponents.map((name) => (
            <ComponentCard key={name}>
              <ComponentName>{name}</ComponentName>
              <ComponentDescription>
                Click to see in sidebar or mention in chat
              </ComponentDescription>
            </ComponentCard>
          ))}
        </ComponentsSidebar>
      </MainContent>
    </PageContainer>
  );
}
