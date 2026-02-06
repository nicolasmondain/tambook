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
import { setConfig } from '../services/configStore';


/**
 * Inner component that handles Tambo integration and channel communication
 */
function TamboContextBridge({
  children,
  parameters,
  currentComponentName,
}: {
  children: React.ReactNode;
  parameters: TambookParameters;
  currentComponentName: string;
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
  // Track which messages have already had their props emitted
  const emittedPropsRef = useRef<Set<string>>(new Set());

  // Emit current component for the story panel (scoped to single component)
  useEffect(() => {
    channel.emit(EVENTS.CURRENT_COMPONENT, {
      componentName: currentComponentName,
    });
  }, [currentComponentName, channel]);

  // Register components with Tambo on mount
  useEffect(() => {
    if (parameters.components) {
      const componentMap = new Map<string, TambookComponentConfig>();
      parameters.components.forEach((config) => {
        componentMap.set(config.name, config);
      });
      componentMapRef.current = componentMap;

      const componentNames = parameters.components.map((c) => c.name);
      // Notify manager of registered components (for design system mode)
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

      // Check for Tambo's component metadata
      const tamboComponent = (msg as any).component;

      if (tamboComponent?.componentName) {
        const componentName = tamboComponent.componentName;

        // Get props ONLY from Tambo's component.props (authoritative source)
        // Do NOT use renderedComponent.props as it contains Tambo's wrapper structure
        // which includes React elements that can't be serialized
        const tamboProps = tamboComponent.props || {};

        // Only set generatedComponent if we have actual props (not empty)
        // This ensures we wait for props to be populated during streaming
        if (Object.keys(tamboProps).length > 0) {
          chatMessage.generatedComponent = {
            componentName,
            props: { ...tamboProps }, // Shallow copy to ensure plain object
          };
        }
      }

      return chatMessage;
    });
  }, [thread]);

  // Sync thread state to manager
  useEffect(() => {
    const messages = convertMessages();
    const state: ThreadState = {
      messages,
      isGenerating,
      error: undefined,
    };

    channel.emit(EVENTS.THREAD_UPDATE, { state });

    // Check for new generated components and emit PROPS_GENERATED
    // Only emit when NOT generating (streaming complete) to ensure props are fully populated
    if (!isGenerating) {
      for (const msg of messages) {
        if (
          msg.generatedComponent &&
          !emittedPropsRef.current.has(msg.id) &&
          Object.keys(msg.generatedComponent.props).length > 0
        ) {
          emittedPropsRef.current.add(msg.id);
          channel.emit(EVENTS.PROPS_GENERATED, {
            componentName: msg.generatedComponent.componentName,
            props: msg.generatedComponent.props,
            messageId: msg.id,
          });
        }
      }
    }
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
 * Simplify a JSON Schema to only essential prop information
 * Returns a clean object with prop names and their allowed values/types
 */
function simplifyPropsSchema(schema: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!schema) return null;

  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties || Object.keys(properties).length === 0) return null;

  const simplified: Record<string, unknown> = {};

  for (const [name, propSchema] of Object.entries(properties)) {
    const enumValues = propSchema.enum as unknown[] | undefined;
    const type = propSchema.type as string | undefined;

    if (enumValues && enumValues.length > 0) {
      simplified[name] = enumValues;
    } else if (type === 'boolean') {
      simplified[name] = 'boolean';
    } else if (type === 'string') {
      simplified[name] = 'string';
    } else if (type === 'number') {
      simplified[name] = 'number';
    } else {
      simplified[name] = type || 'any';
    }
  }

  return simplified;
}

/**
 * Build context helpers for Tambo that provide current component information.
 * This scopes the AI conversation to the component being viewed.
 */
function buildContextHelpers(
  currentComponentName: string,
  currentComponentDescription: string,
  propsSchema: Record<string, unknown> | undefined
): Record<string, () => string> {
  return {
    getCurrentComponentContext: () => {
      const simplifiedSchema = simplifyPropsSchema(propsSchema);
      const schemaInfo = simplifiedSchema
        ? `\n\nProps schema:\n${JSON.stringify(simplifiedSchema, null, 2)}`
        : '';

      return `You are helping configure the "${currentComponentName}" component.
${currentComponentDescription}

IMPORTANT SCOPE LIMITATION:
- You are currently in SINGLE-COMPONENT MODE, which means you can ONLY help with the "${currentComponentName}" component.
- You do NOT have access to any other components in this mode.
- If the user asks for a different component or wants to combine multiple components, politely explain:
  "This Tambo panel is scoped to the ${currentComponentName} component only. To work with other components or combine multiple components together, please navigate to the Design System page from the sidebar menu."

When the user asks to modify props, only include the props they mentioned. Unmentioned props will keep their current values - do not set them to null.${schemaInfo}`;
    },
  };
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

  // Extract component from current story context
  const extractedComponent = autoExtract
    ? extractComponentFromContext(context as unknown as ExtractorContext)
    : null;

  // Auto-extract component from current story context
  if (extractedComponent) {
    // Register to global registry (tracks unique components)
    globalComponentRegistry.register(extractedComponent);
  }

  // Get current component info for context scoping (single-component mode)
  const currentComponentName = extractedComponent?.name || 'Unknown';
  const currentComponentDescription = extractedComponent?.description || 'A component';
  const currentPropsSchema = extractedComponent?.propsSchema;

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

  // Store config globally so DesignSystemChat can access it
  if (apiKey) {
    setConfig({ apiKey, apiUrl: tamboUrl });
  }

  // Warn if no API key is provided for Tambo Cloud
  if (!apiKey && !tamboUrl) {
    console.warn(
      '[Tambook] No API key provided. Get your key at https://tambo.co and add it to your Storybook parameters:\n' +
      'parameters: { tambook: { apiKey: import.meta.env.STORYBOOK_TAMBO_API_KEY } }'
    );
  }


  // Don't render TamboProvider without an API key (would fail anyway)
  if (!apiKey) {
    return <StoryFn />;
  }

  // Get ONLY the current component for single-component mode (story panel)
  // This ensures the AI can only generate the component being viewed
  const currentComponentTool = componentTools.find((c) => c.name === currentComponentName);
  const singleComponentTools: TamboComponent[] = currentComponentTool ? [currentComponentTool] : [];

  // Create augmented parameters for the bridge (single component only)
  const augmentedParameters: TambookParameters = {
    ...parameters,
    components: singleComponentTools as TambookComponentConfig[],
  };

  // Build context helpers scoped to the current component (for story panel)
  const contextHelpers = buildContextHelpers(
    currentComponentName,
    currentComponentDescription,
    currentPropsSchema as Record<string, unknown> | undefined
  );

  return (
    <TamboProvider
      tamboUrl={tamboUrl}
      apiKey={apiKey}
      components={singleComponentTools}
      contextHelpers={contextHelpers}
    >
      <TamboContextBridge
        parameters={augmentedParameters}
        currentComponentName={currentComponentName}
      >
        <StoryFn />
      </TamboContextBridge>
    </TamboProvider>
  );
};

