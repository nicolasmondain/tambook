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
import {
  fetchStoryIndex,
  getOneStoryPerComponent,
} from '../services/storyIndexService';

/**
 * Storybook Preview global API (internal)
 */
declare global {
  interface Window {
    __STORYBOOK_PREVIEW__?: {
      storyStoreValue?: {
        cacheAllCSFFiles: () => Promise<void>;
        loadStory: (options: { storyId: string }) => Promise<PreparedStory>;
        extract: () => Record<string, StoryData>;
      };
      // Alternative access pattern
      storyStore?: {
        cacheAllCSFFiles: () => Promise<void>;
        loadStory: (options: { storyId: string }) => Promise<PreparedStory>;
        extract: () => Record<string, StoryData>;
      };
    };
  }
}

/**
 * Prepared story from loadStory
 */
interface PreparedStory {
  id: string;
  title: string;
  name: string;
  component?: React.ComponentType<unknown>;
  argTypes?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

/**
 * Internal Storybook story data structure
 */
interface StoryData {
  id: string;
  title: string;
  name: string;
  component?: React.ComponentType<unknown>;
  argTypes?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

/**
 * Flag to track if preparation has been initiated
 */
let preparationInitiated = false;

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
  // Track which messages have already had their props emitted
  const emittedPropsRef = useRef<Set<string>>(new Set());

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

When the user asks to modify props, only include the props they mentioned. Unmentioned props will keep their current values - do not set them to null.${schemaInfo}`;
    },
  };
}

/**
 * Component info for design system context
 */
interface ComponentInfo {
  name: string;
  description: string;
  propsSchema?: Record<string, unknown>;
}

/**
 * Build context helpers for Design System mode.
 * Provides full access to all components with composition support.
 */
function buildDesignSystemContextHelpers(
  allComponents: ComponentInfo[]
): Record<string, () => string> {
  return {
    getDesignSystemContext: () => {
      const componentSummaries = allComponents.map((comp) => {
        const simplifiedSchema = simplifyPropsSchema(comp.propsSchema);
        const propsInfo = simplifiedSchema
          ? `\n    Props: ${JSON.stringify(simplifiedSchema)}`
          : '';
        return `  - ${comp.name}: ${comp.description}${propsInfo}`;
      }).join('\n');

      return `You are a design system assistant with access to ALL of the following components:

${componentSummaries}

IMPORTANT GUIDELINES:
1. You can use ANY of these components to fulfill the user's request
2. Components can be NESTED inside each other (e.g., Button inside Card) up to 5 levels deep
3. Use the "children" prop to compose components together
4. When nesting components, render child components as React elements
5. Only include props that are explicitly needed - omit props to use defaults
6. Be creative in combining components to create rich, functional UIs

Example compositions:
- A Card with a Button: Use Card with children containing a Button
- A form: Combine multiple Input components with a submit Button
- A notification: Badge inside a Card with descriptive text

Think about which components to combine and how to nest them to best fulfill the user's request.`;
    },
  };
}

/**
 * Bridge component for Design System mode
 * Handles separate thread and context for full design system access
 */
function DesignSystemBridge({
  allComponents,
}: {
  allComponents: TamboComponent[];
}) {
  const channel = addons.getChannel();
  const { thread, sendThreadMessage, startNewThread } = useTambo();
  const [isGenerating, setIsGenerating] = useState(false);
  const emittedPropsRef = useRef<Set<string>>(new Set());

  // Convert messages for the design system thread
  const convertMessages = useCallback((): ChatMessage[] => {
    if (!thread?.messages) return [];

    return thread.messages.map((msg) => {
      let textContent = '';
      if (typeof msg.content === 'string') {
        textContent = msg.content;
      } else if (Array.isArray(msg.content)) {
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

      const tamboComponent = (msg as Record<string, unknown>).component as {
        componentName?: string;
        props?: Record<string, unknown>;
      } | undefined;

      if (tamboComponent?.componentName) {
        const tamboProps = tamboComponent.props || {};
        if (Object.keys(tamboProps).length > 0) {
          chatMessage.generatedComponent = {
            componentName: tamboComponent.componentName,
            props: { ...tamboProps },
          };
        }
      }

      return chatMessage;
    });
  }, [thread]);

  // Sync design system thread state to manager
  useEffect(() => {
    const messages = convertMessages();
    const state: ThreadState = {
      messages,
      isGenerating,
      error: undefined,
    };
    channel.emit(EVENTS.DS_THREAD_UPDATE, { state });
  }, [thread, isGenerating, convertMessages, channel]);

  // Handle design system messages
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
      emittedPropsRef.current.clear();
    };

    channel.on(EVENTS.SEND_DS_MESSAGE, handleSendMessage);
    channel.on(EVENTS.CLEAR_DS_THREAD, handleClearThread);

    return () => {
      channel.off(EVENTS.SEND_DS_MESSAGE, handleSendMessage);
      channel.off(EVENTS.CLEAR_DS_THREAD, handleClearThread);
    };
  }, [channel, sendThreadMessage, startNewThread]);

  return null;
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

  // Build context helpers scoped to the current component (for story panel)
  const contextHelpers = buildContextHelpers(
    currentComponentName,
    currentComponentDescription,
    currentPropsSchema as Record<string, unknown> | undefined
  );

  // Build context helpers for design system mode (all components)
  const allComponentsInfo: ComponentInfo[] = componentTools.map((c) => ({
    name: c.name,
    description: c.description,
    propsSchema: c.propsSchema as Record<string, unknown> | undefined,
  }));
  const designSystemContextHelpers = buildDesignSystemContextHelpers(allComponentsInfo);

  return (
    <>
      {/* Primary provider for single-component story mode */}
      <TamboProvider
        tamboUrl={tamboUrl}
        apiKey={apiKey}
        components={componentTools}
        contextHelpers={contextHelpers}
      >
        <TamboContextBridge parameters={augmentedParameters}>
          <ComponentPreloader />
          <StoryFn />
        </TamboContextBridge>
      </TamboProvider>

      {/* Secondary provider for design system mode (all components) */}
      <TamboProvider
        tamboUrl={tamboUrl}
        apiKey={apiKey}
        components={componentTools}
        contextHelpers={designSystemContextHelpers}
      >
        <DesignSystemBridge allComponents={componentTools} />
      </TamboProvider>
    </>
  );
};

/**
 * Component that handles preparation of all stories at startup.
 * Runs once per Storybook session to pre-load all component metadata.
 */
function ComponentPreloader() {
  const channel = addons.getChannel();

  useEffect(() => {
    const handlePrepareAll = async () => {
      // Prevent multiple preparations
      if (preparationInitiated) {
        return;
      }
      preparationInitiated = true;

      console.log('[Tambook] Starting component preparation...');

      try {
        // Fetch story index
        const entries = await fetchStoryIndex();
        if (entries.length === 0) {
          console.warn('[Tambook] No stories found in index');
          channel.emit(EVENTS.ALL_COMPONENTS_READY, {
            components: globalComponentRegistry.getNames(),
          });
          return;
        }

        // Get one story per component (more efficient than loading all stories)
        const componentStories = getOneStoryPerComponent(entries);
        const storyIds = Array.from(componentStories.values());
        const totalStories = storyIds.length;

        console.log(`[Tambook] Found ${totalStories} unique components to prepare`);

        // Emit progress start
        channel.emit(EVENTS.PREPARATION_PROGRESS, {
          loaded: 0,
          total: totalStories,
        });

        // Get the Storybook preview API
        const preview = window.__STORYBOOK_PREVIEW__;
        const storyStore = preview?.storyStoreValue || preview?.storyStore;
        if (!storyStore) {
          console.warn('[Tambook] Storybook preview API not available');
          channel.emit(EVENTS.ALL_COMPONENTS_READY, {
            components: globalComponentRegistry.getNames(),
          });
          return;
        }

        // For each story, trigger preparation
        for (let i = 0; i < storyIds.length; i++) {
          const storyId = storyIds[i];
          try {
            // Use Storybook's internal API to prepare story
            // loadStory returns the prepared story directly
            const story = await storyStore.loadStory({ storyId }) as PreparedStory;

            if (story?.argTypes && story?.component) {
              // Build a context-like object for extraction
              const extractorContext: ExtractorContext = {
                title: story.title,
                name: story.name,
                component: story.component,
                argTypes: story.argTypes as Record<string, unknown> as ExtractorContext['argTypes'],
                parameters: story.parameters as ExtractorContext['parameters'],
              };

              const extracted = extractComponentFromContext(extractorContext);
              if (extracted) {
                const isNew = globalComponentRegistry.register(extracted);
                if (isNew) {
                  console.log(`[Tambook] Prepared component: ${extracted.name}`);
                  channel.emit(EVENTS.STORY_PREPARED, {
                    componentName: extracted.name,
                    storyId,
                  });
                }
              }
            }
          } catch (e) {
            console.warn(`[Tambook] Failed to prepare story ${storyId}:`, e);
          }

          // Emit progress update
          channel.emit(EVENTS.PREPARATION_PROGRESS, {
            loaded: i + 1,
            total: totalStories,
          });
        }

        // Notify completion
        const componentNames = globalComponentRegistry.getNames();
        console.log(`[Tambook] Component preparation complete: ${componentNames.length} components`);
        channel.emit(EVENTS.ALL_COMPONENTS_READY, {
          components: componentNames,
        });
      } catch (error) {
        console.error('[Tambook] Component preparation failed:', error);
        // Still emit ready event with whatever components we have
        channel.emit(EVENTS.ALL_COMPONENTS_READY, {
          components: globalComponentRegistry.getNames(),
        });
      }
    };

    // Handle requests for current component list (for late-mounting components like DesignSystemPage)
    const handleRequestComponents = () => {
      const componentNames = globalComponentRegistry.getNames();
      if (componentNames.length > 0) {
        channel.emit(EVENTS.ALL_COMPONENTS_READY, {
          components: componentNames,
        });
      }
    };

    channel.on(EVENTS.REQUEST_PREPARE_ALL, handlePrepareAll);
    channel.on(EVENTS.REQUEST_COMPONENTS, handleRequestComponents);
    return () => {
      channel.off(EVENTS.REQUEST_PREPARE_ALL, handlePrepareAll);
      channel.off(EVENTS.REQUEST_COMPONENTS, handleRequestComponents);
    };
  }, [channel]);

  return null;
}
