import React, { useEffect, useCallback, useRef } from 'react';
import type { DecoratorFunction, Renderer } from 'storybook/internal/types';
import { addons } from 'storybook/internal/preview-api';
import { TamboProvider, useTambo, type TamboComponent } from '@tambo-ai/react';
import { EVENTS, PARAM_KEY, DEFAULT_CONFIG } from '../constants';
import type {
  TambookParameters,
  TambookComponentConfig,
  SendMessagePayload,
  ThreadState,
  ChatMessage,
} from '../types';

/**
 * Inner component that handles Tambo integration and channel communication
 */
function TamboContextBridge({
  children,
  parameters,
}: {
  children: React.ReactNode;
  parameters: TambookParameters;
}) {
  const channel = addons.getChannel();
  const {
    thread,
    sendThreadMessage,
    startNewThread,
    streaming,
  } = useTambo();
  const componentMapRef = useRef<Map<string, TambookComponentConfig>>(new Map());

  // Register components with Tambo on mount
  useEffect(() => {
    if (parameters.components) {
      const componentMap = new Map<string, TambookComponentConfig>();
      parameters.components.forEach((config) => {
        componentMap.set(config.name, config);
      });
      componentMapRef.current = componentMap;

      // Notify manager of registered components
      channel.emit(EVENTS.COMPONENTS_REGISTERED, {
        componentNames: parameters.components.map((c) => c.name),
      });
    }
  }, [parameters.components, channel]);

  // Convert Tambo thread messages to our ChatMessage format
  const convertMessages = useCallback((): ChatMessage[] => {
    if (!thread?.messages) return [];

    return thread.messages.map((msg) => {
      // Extract text content from message
      let textContent = '';
      if (typeof msg.content === 'string') {
        textContent = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Handle array of content parts
        textContent = msg.content
          .filter((part): part is { type: 'text'; text: string } =>
            typeof part === 'object' && part !== null && 'type' in part && part.type === 'text'
          )
          .map((part) => part.text)
          .join('');
      }

      const chatMessage: ChatMessage = {
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: textContent,
        timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
      };

      // Check if the message has a rendered component
      if (msg.renderedComponent) {
        // The renderedComponent is a ReactElement
        const element = msg.renderedComponent;
        const componentType = element.type;

        // Try to find the component name from our registered components
        let componentName = 'Unknown';
        for (const [name, config] of componentMapRef.current.entries()) {
          if (config.component === componentType) {
            componentName = name;
            break;
          }
        }

        chatMessage.generatedComponent = {
          componentName,
          props: element.props || {},
          element,
        };
      }

      return chatMessage;
    });
  }, [thread]);

  // Sync thread state to manager
  useEffect(() => {
    const state: ThreadState = {
      messages: convertMessages(),
      isGenerating: streaming ?? false,
      error: undefined,
    };

    channel.emit(EVENTS.THREAD_UPDATE, { state });
  }, [thread, streaming, convertMessages, channel]);

  // Handle incoming messages from manager
  useEffect(() => {
    const handleSendMessage = async (payload: SendMessagePayload) => {
      try {
        await sendThreadMessage(payload.content);
      } catch (error) {
        channel.emit(EVENTS.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to send message',
        });
      }
    };

    const handleClearThread = () => {
      startNewThread();
    };

    channel.on(EVENTS.SEND_MESSAGE, handleSendMessage);
    channel.on(EVENTS.CLEAR_THREAD, handleClearThread);

    return () => {
      channel.off(EVENTS.SEND_MESSAGE, handleSendMessage);
      channel.off(EVENTS.CLEAR_THREAD, handleClearThread);
    };
  }, [channel, sendThreadMessage, startNewThread]);

  return <>{children}</>;
}

/**
 * Decorator that wraps stories with TamboProvider context
 *
 * This enables AI-powered component generation within the story iframe.
 * The decorator communicates with the manager panel via Storybook channels.
 */
export const withTamboContext: DecoratorFunction<Renderer> = (StoryFn, context) => {
  const parameters = (context.parameters?.[PARAM_KEY] || {}) as TambookParameters;
  const tamboUrl = parameters.apiUrl || DEFAULT_CONFIG.apiUrl;

  // Build component tools for Tambo from registered components
  const componentTools: TamboComponent[] = (parameters.components || []).map((config) => ({
    name: config.name,
    description: config.description,
    component: config.component,
    propsSchema: config.propsSchema,
  }));

  // API key is required by TamboProvider
  // For self-hosted mode, we use a placeholder key
  const apiKey = parameters.apiKey || 'tambook-local';

  return (
    <TamboProvider
      tamboUrl={tamboUrl}
      apiKey={apiKey}
      components={componentTools}
    >
      <TamboContextBridge parameters={parameters}>
        <StoryFn />
      </TamboContextBridge>
    </TamboProvider>
  );
};
