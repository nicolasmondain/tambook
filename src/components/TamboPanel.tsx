import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useChannel, useAddonState, useStorybookApi } from 'storybook/internal/manager-api';
import { AddonPanel } from 'storybook/internal/components';
import { ADDON_ID, EVENTS } from '../constants';
import type {
  ThreadState,
  ThreadUpdatePayload,
  ErrorPayload,
  PropsGeneratedPayload,
} from '../types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { styled } from 'storybook/internal/theming';

interface TamboPanelProps {
  active: boolean;
}

const PanelContainer = styled.div({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
});

const Header = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 12px',
  borderBottom: `1px solid ${theme.appBorderColor}`,
  backgroundColor: theme.background.bar,
}));

const Title = styled.span(({ theme }) => ({
  fontSize: '13px',
  fontWeight: 600,
  color: theme.color.defaultText,
}));

const ComponentCount = styled.span(({ theme }) => ({
  fontSize: '11px',
  color: theme.color.mediumdark,
  marginLeft: '8px',
}));

const ClearButton = styled.button(({ theme }) => ({
  padding: '4px 8px',
  fontSize: '11px',
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

const ContentArea = styled.div({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const ErrorBanner = styled.div(({ theme }) => ({
  padding: '8px 12px',
  backgroundColor: theme.color.negative,
  color: theme.color.lightest,
  fontSize: '12px',
}));

const EmptyState = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  padding: '32px',
  textAlign: 'center',
  color: theme.color.mediumdark,
}));

const EmptyStateTitle = styled.h3(({ theme }) => ({
  margin: '0 0 8px 0',
  fontSize: '14px',
  fontWeight: 600,
  color: theme.color.defaultText,
}));

const EmptyStateText = styled.p({
  margin: 0,
  fontSize: '12px',
  lineHeight: 1.5,
});

const defaultThreadState: ThreadState = {
  messages: [],
  isGenerating: false,
  error: undefined,
};

/**
 * Main chat panel component displayed in Storybook's addon panel area
 */
export function TamboPanel({ active }: TamboPanelProps) {
  const api = useStorybookApi();
  const [threadState, setThreadState] = useAddonState<ThreadState>(
    `${ADDON_ID}/thread`,
    defaultThreadState
  );
  // Current component for this story (scoped, not all components)
  const [currentComponent, setCurrentComponent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track which messages have had their props applied to Controls
  const [appliedPropsMessageIds, setAppliedPropsMessageIds] = useState<Set<string>>(new Set());

  // Track if we've received a live update from the preview
  const hasReceivedLiveUpdate = useRef(false);
  // Track if we've already reset the stale isGenerating state
  const hasResetStaleState = useRef(false);

  // Reset isGenerating if it's stale (from persisted storage, not from live preview)
  useEffect(() => {
    // Only reset once, and only if we haven't received a live update yet
    if (
      threadState.isGenerating &&
      !hasResetStaleState.current &&
      !hasReceivedLiveUpdate.current
    ) {
      hasResetStaleState.current = true;
      setThreadState({ ...threadState, isGenerating: false });
    }
  }, [threadState, setThreadState]);

  const emit = useChannel({
    [EVENTS.THREAD_UPDATE]: (payload: ThreadUpdatePayload) => {
      // Mark that we've received a live update from the preview
      hasReceivedLiveUpdate.current = true;
      setThreadState(payload.state);
      if (payload.state.error) {
        setError(payload.state.error);
      }
    },
    // Listen for the current component (scoped to this story)
    [EVENTS.CURRENT_COMPONENT]: (payload: { componentName: string }) => {
      setCurrentComponent(payload.componentName);
    },
    [EVENTS.PROPS_GENERATED]: (payload: PropsGeneratedPayload) => {
      // Update the current story's args with the generated props
      try {
        const currentStory = api.getCurrentStoryData();
        if (currentStory) {
          // Filter out null/undefined values - only apply props that were explicitly set
          const filteredProps = Object.fromEntries(
            Object.entries(payload.props).filter(([, value]) => value != null)
          );
          if (Object.keys(filteredProps).length > 0) {
            api.updateStoryArgs(currentStory, filteredProps);
          }
          // Track that we applied props for this message
          setAppliedPropsMessageIds(prev => new Set(prev).add(payload.messageId));
        }
      } catch (err) {
        console.error('[Tambook] Failed to update story args:', err);
      }
    },
    [EVENTS.ERROR]: (payload: ErrorPayload) => {
      setError(payload.message);
    },
  });

  const handleSendMessage = useCallback(
    (content: string) => {
      setError(null);
      emit(EVENTS.SEND_MESSAGE, { content });
    },
    [emit]
  );

  const handleClearThread = useCallback(() => {
    setError(null);
    emit(EVENTS.CLEAR_THREAD);
    setThreadState(defaultThreadState);
  }, [emit, setThreadState]);

  const handleCopyProps = useCallback((props: Record<string, unknown>) => {
    navigator.clipboard.writeText(JSON.stringify(props, null, 2));
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const hasMessages = threadState.messages.length > 0;
  const isReady = currentComponent && currentComponent !== 'Unknown';

  return (
    <AddonPanel active={active}>
      <PanelContainer>
        <Header>
          <div>
            <Title>Tambook</Title>
            {currentComponent && currentComponent !== 'Unknown' && (
              <ComponentCount>{currentComponent}</ComponentCount>
            )}
          </div>
          {hasMessages && (
            <ClearButton onClick={handleClearThread}>Clear</ClearButton>
          )}
        </Header>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <ContentArea>
          {hasMessages ? (
            <MessageList
              messages={threadState.messages}
              isGenerating={threadState.isGenerating}
              onCopyProps={handleCopyProps}
              appliedPropsMessageIds={appliedPropsMessageIds}
            />
          ) : (
            <EmptyState>
              <EmptyStateTitle>Configure {currentComponent || 'Component'} with AI</EmptyStateTitle>
              <EmptyStateText>
                Describe the {currentComponent || 'component'} you want and Tambook will configure the
                Controls automatically.
              </EmptyStateText>
            </EmptyState>
          )}

          <ChatInput
            onSend={handleSendMessage}
            disabled={threadState.isGenerating || !isReady}
            placeholder={
              isReady
                ? `Describe a ${currentComponent} to generate...`
                : 'Waiting for component...'
            }
          />
        </ContentArea>
      </PanelContainer>
    </AddonPanel>
  );
}
