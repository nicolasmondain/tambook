import React, { useState, useEffect, useCallback, useRef } from 'react';
import { addons } from 'storybook/internal/preview-api';
import { EVENTS } from '../constants';

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

// Inline styles (since we're in preview context, styled-components from theming may not work)
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '600px',
    border: '1px solid #e6e6e6',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid #e6e6e6',
    backgroundColor: '#f8f8f8',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
  },
  subtitle: {
    fontSize: '13px',
    color: '#666',
    marginLeft: '12px',
  },
  clearButton: {
    padding: '8px 16px',
    fontSize: '13px',
    color: '#666',
    backgroundColor: 'transparent',
    border: '1px solid #e6e6e6',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  chatSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px',
  },
  messageBubbleUser: {
    maxWidth: '70%',
    marginBottom: '16px',
    padding: '12px 16px',
    borderRadius: '12px',
    marginLeft: 'auto',
    backgroundColor: '#029CFD',
    color: '#fff',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  messageBubbleAssistant: {
    maxWidth: '70%',
    marginBottom: '16px',
    padding: '12px 16px',
    borderRadius: '12px',
    marginRight: 'auto',
    backgroundColor: '#f0f0f0',
    color: '#333',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  generatedComponent: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #e6e6e6',
  },
  componentTag: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#029CFD',
    backgroundColor: 'rgba(2, 156, 253, 0.1)',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  propsDisplay: {
    margin: 0,
    fontSize: '11px',
    color: '#666',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    fontFamily: 'monospace',
  },
  inputArea: {
    padding: '16px 24px',
    borderTop: '1px solid #e6e6e6',
    backgroundColor: '#f8f8f8',
  },
  inputWrapper: {
    display: 'flex',
    gap: '12px',
  },
  textInput: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
    border: '1px solid #e6e6e6',
    borderRadius: '8px',
    resize: 'none' as const,
    minHeight: '48px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  sendButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#029CFD',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  sendButtonDisabled: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#999',
    border: 'none',
    borderRadius: '8px',
    cursor: 'not-allowed',
  },
  loadingBar: {
    padding: '12px 24px',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #e6e6e6',
    fontSize: '13px',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressContainer: {
    flex: 1,
    height: '6px',
    backgroundColor: '#e6e6e6',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#029CFD',
    borderRadius: '3px',
    transition: 'width 0.2s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '48px',
    textAlign: 'center' as const,
    color: '#666',
  },
  emptyStateTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
  },
  emptyStateText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.6,
    maxWidth: '400px',
  },
  sidebar: {
    width: '240px',
    borderLeft: '1px solid #e6e6e6',
    padding: '16px',
    overflowY: 'auto' as const,
    backgroundColor: '#fafafa',
  },
  sidebarTitle: {
    margin: '0 0 12px 0',
    fontSize: '12px',
    fontWeight: 600,
    color: '#333',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  componentCard: {
    padding: '10px',
    marginBottom: '8px',
    backgroundColor: '#fff',
    borderRadius: '6px',
    border: '1px solid #e6e6e6',
  },
  componentName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  typingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 16px',
    marginBottom: '16px',
    maxWidth: '80px',
    borderRadius: '12px',
    backgroundColor: '#f0f0f0',
  },
  typingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#999',
  },
};

/**
 * Design System Chat - Preview-compatible component for MDX pages
 * This component can be embedded directly in MDX documentation pages.
 */
export function DesignSystemChat() {
  const [threadState, setThreadState] = useState<ThreadState>({
    messages: [],
    isGenerating: false,
  });
  const [registeredComponents, setRegisteredComponents] = useState<string[]>([]);
  const [preparationProgress, setPreparationProgress] = useState<PreparationProgress | null>(null);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef(addons.getChannel());

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadState.messages, threadState.isGenerating]);

  // Set up channel listeners
  useEffect(() => {
    const channel = channelRef.current;

    const handleThreadUpdate = (payload: { state: ThreadState }) => {
      setThreadState(payload.state);
    };

    const handleComponentsRegistered = (payload: { componentNames: string[] }) => {
      setRegisteredComponents(payload.componentNames);
    };

    const handleProgress = (payload: PreparationProgress) => {
      setPreparationProgress(payload);
    };

    const handleReady = (payload: { components: string[] }) => {
      setPreparationProgress(null);
      setRegisteredComponents(payload.components);
    };

    channel.on(EVENTS.DS_THREAD_UPDATE, handleThreadUpdate);
    channel.on(EVENTS.COMPONENTS_REGISTERED, handleComponentsRegistered);
    channel.on(EVENTS.PREPARATION_PROGRESS, handleProgress);
    channel.on(EVENTS.ALL_COMPONENTS_READY, handleReady);

    // Request current components on mount
    channel.emit(EVENTS.REQUEST_COMPONENTS);

    return () => {
      channel.off(EVENTS.DS_THREAD_UPDATE, handleThreadUpdate);
      channel.off(EVENTS.COMPONENTS_REGISTERED, handleComponentsRegistered);
      channel.off(EVENTS.PREPARATION_PROGRESS, handleProgress);
      channel.off(EVENTS.ALL_COMPONENTS_READY, handleReady);
    };
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || threadState.isGenerating) return;
    channelRef.current.emit(EVENTS.SEND_DS_MESSAGE, { content: inputValue.trim() });
    setInputValue('');
  }, [inputValue, threadState.isGenerating]);

  const handleClearThread = useCallback(() => {
    channelRef.current.emit(EVENTS.CLEAR_DS_THREAD);
    setThreadState({ messages: [], isGenerating: false });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasMessages = threadState.messages.length > 0;
  const isReady = registeredComponents.length > 0 && !preparationProgress;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 style={styles.title}>Design System Chat</h2>
          <span style={styles.subtitle}>
            {registeredComponents.length} components available
          </span>
        </div>
        {hasMessages && (
          <button style={styles.clearButton} onClick={handleClearThread}>
            Clear Chat
          </button>
        )}
      </div>

      {preparationProgress && (
        <div style={styles.loadingBar}>
          <span>
            Loading design system... {preparationProgress.loaded}/{preparationProgress.total}
          </span>
          <div style={styles.progressContainer}>
            <div
              style={{
                ...styles.progressFill,
                width: `${preparationProgress.total > 0
                  ? (preparationProgress.loaded / preparationProgress.total) * 100
                  : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <div style={styles.mainContent}>
        <div style={styles.chatSection}>
          <div style={styles.messagesContainer}>
            {hasMessages ? (
              <>
                {threadState.messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant}
                  >
                    {msg.content}
                    {msg.generatedComponent && (
                      <div style={styles.generatedComponent}>
                        <span style={styles.componentTag}>{msg.generatedComponent.componentName}</span>
                        <pre style={styles.propsDisplay}>
                          {JSON.stringify(msg.generatedComponent.props, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
                {threadState.isGenerating && (
                  <div style={styles.typingIndicator}>
                    <span style={styles.typingDot} />
                    <span style={styles.typingDot} />
                    <span style={styles.typingDot} />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div style={styles.emptyState}>
                <h3 style={styles.emptyStateTitle}>Design System Assistant</h3>
                <p style={styles.emptyStateText}>
                  Chat with your entire design system. Describe the UI you want to build
                  and I'll help you compose components together. You can mix and match
                  any of the {registeredComponents.length} available components.
                </p>
              </div>
            )}
          </div>

          <div style={styles.inputArea}>
            <div style={styles.inputWrapper}>
              <textarea
                style={styles.textInput}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isReady
                    ? 'Describe the UI you want to build...'
                    : 'Loading components...'
                }
                disabled={!isReady || threadState.isGenerating}
                rows={1}
              />
              <button
                style={!isReady || threadState.isGenerating || !inputValue.trim()
                  ? styles.sendButtonDisabled
                  : styles.sendButton}
                onClick={handleSendMessage}
                disabled={!isReady || threadState.isGenerating || !inputValue.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        <div style={styles.sidebar}>
          <h4 style={styles.sidebarTitle}>Available Components</h4>
          {registeredComponents.map((name) => (
            <div key={name} style={styles.componentCard}>
              <div style={styles.componentName}>{name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
