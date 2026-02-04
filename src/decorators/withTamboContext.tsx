import React, { useEffect, useCallback, useRef, useState } from 'react';
import type { DecoratorFunction, Renderer } from 'storybook/internal/types';
import { addons } from 'storybook/internal/preview-api';
import { TamboProvider, useTambo, type TamboComponent } from '@tambo-ai/react';
import { EVENTS, PARAM_KEY } from '../constants';
import type {
  TambookParameters,
  TambookComponentConfig,
  SendMessagePayload,
  ThreadState,
  ChatMessage,
} from '../types';
import {
  extractComponentFromContext,
  globalComponentRegistry,
  type StoryContext as ExtractorContext,
} from '../services/componentExtractor';

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
  } = useTambo();
  const componentMapRef = useRef<Map<string, TambookComponentConfig>>(new Map());
  // Track our own generating state since useTambo's streaming can be unreliable
  const [isGenerating, setIsGenerating] = useState(false);

  // Register components with Tambo on mount
  useEffect(() => {
    if (parameters.components) {
      const componentMap = new Map<string, TambookComponentConfig>();
      parameters.components.forEach((config) => {
        componentMap.set(config.name, config);
      });
      componentMapRef.current = componentMap;

      const componentNames = parameters.components.map((c) => c.name);
      // Notify manager of registered components
      channel.emit(EVENTS.COMPONENTS_REGISTERED, {
        componentNames,
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
          // Note: element is not included as React elements can't be serialized
          // through the Storybook channel. The component is rendered in the
          // Preview iframe by Tambo directly.
        };
      }

      return chatMessage;
    });
  }, [thread]);

  // Sync thread state to manager
  useEffect(() => {
    const state: ThreadState = {
      messages: convertMessages(),
      isGenerating,
      error: undefined,
    };

    channel.emit(EVENTS.THREAD_UPDATE, { state });
  }, [thread, isGenerating, convertMessages, channel]);

  // Handle incoming messages from manager
  useEffect(() => {
    const handleSendMessage = async (payload: SendMessagePayload) => {
      try {
        setIsGenerating(true);
        await sendThreadMessage(payload.content);
      } catch (error) {
        channel.emit(EVENTS.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to send message',
        });
      } finally {
        setIsGenerating(false);
      }
    };

    const handleClearThread = () => {
      setIsGenerating(false);
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
  // Only pass tamboUrl if explicitly configured, otherwise SDK uses Tambo Cloud
  const tamboUrl = parameters.apiUrl;

  // Check if auto-extraction is enabled (default: true)
  const autoExtract = parameters.autoExtract !== false;

  // Auto-extract component from current story context
  if (autoExtract) {
    const extractedComponent = extractComponentFromContext(context as unknown as ExtractorContext);
    if (extractedComponent) {
      // Register to global registry (tracks unique components)
      globalComponentRegistry.register(extractedComponent);
    }
  }

  // Build component tools for Tambo from manually registered components
  const manualComponents: TamboComponent[] = (parameters.components || []).map((config) => ({
    name: config.name,
    description: config.description,
    component: config.component,
    propsSchema: config.propsSchema,
  }));

  // Create a set of manually configured component names for priority checking
  const manualComponentNames = new Set(manualComponents.map((c) => c.name));

  // Get auto-extracted components (excluding any manually configured ones)
  const autoExtractedComponents: TamboComponent[] = autoExtract
    ? globalComponentRegistry
        .getAll()
        .filter((c) => !manualComponentNames.has(c.name))
        .map((c) => ({
          name: c.name,
          description: c.description,
          component: c.component,
          propsSchema: c.propsSchema,
        }))
    : [];

  // Combine: manual components take precedence, then auto-extracted
  const componentTools: TamboComponent[] = [...manualComponents, ...autoExtractedComponents];

  // API key handling
  const apiKey = parameters.apiKey;

  // Warn if no API key is provided for Tambo Cloud
  if (!apiKey && !tamboUrl) {
    console.warn(
      '[Tambook] No API key provided. Get your key at https://tambo.co and add it to your Storybook parameters:\n' +
      'parameters: { tambook: { apiKey: import.meta.env.STORYBOOK_TAMBO_API_KEY } }'
    );
  }

  // Create augmented parameters for the bridge
  const augmentedParameters: TambookParameters = {
    ...parameters,
    components: componentTools as TambookComponentConfig[],
  };

  // Don't render TamboProvider without an API key (would fail anyway)
  if (!apiKey) {
    return <StoryFn />;
  }

  return (
    <TamboProvider
      tamboUrl={tamboUrl}
      apiKey={apiKey}
      components={componentTools}
    >
      <TamboContextBridge parameters={augmentedParameters}>
        <StoryFn />
      </TamboContextBridge>
    </TamboProvider>
  );
};
