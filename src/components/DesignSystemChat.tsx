import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { addons } from 'storybook/internal/preview-api';
import { TamboProvider, useTambo, type TamboComponent } from '@tambo-ai/react';
import { EVENTS } from '../constants';
import { globalComponentRegistry } from '../services/componentExtractor';
import { getConfig } from '../services/configStore';

/**
 * Structure for nested component props from Tambo
 */
interface NestedComponentProps {
  componentName: string;
  props: Record<string, unknown>;
}

/**
 * Message structure for the chat
 */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  generatedComponent?: NestedComponentProps;
  renderedComponent?: React.ReactNode;
}

interface PreparationProgress {
  loaded: number;
  total: number;
}

/**
 * Simplify a JSON Schema to only essential prop information
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
 * Check if a component's schema has a children prop
 */
function hasChildrenProp(propsSchema?: Record<string, unknown>): boolean {
  if (!propsSchema) return false;
  const properties = propsSchema.properties as Record<string, unknown> | undefined;
  return properties ? 'children' in properties : false;
}

/**
 * Build context helpers for Design System mode.
 * Explains component composition based on which components support children.
 */
function buildDesignSystemContextHelpers(
  allComponents: Array<{ name: string; description: string; propsSchema?: Record<string, unknown> }>
): Record<string, () => string> {
  return {
    getDesignSystemContext: () => {
      // Separate components into those that support nesting vs those that don't
      const nestableComponents: string[] = [];
      const leafComponents: string[] = [];

      const componentSummaries = allComponents.map((comp) => {
        const simplifiedSchema = simplifyPropsSchema(comp.propsSchema);
        const supportsChildren = hasChildrenProp(comp.propsSchema);

        if (supportsChildren) {
          nestableComponents.push(comp.name);
        } else {
          leafComponents.push(comp.name);
        }

        const propsInfo = simplifiedSchema
          ? `\n    Props: ${JSON.stringify(simplifiedSchema)}`
          : '';
        const nestingInfo = supportsChildren ? ' [supports children]' : '';
        return `  - ${comp.name}${nestingInfo}: ${comp.description}${propsInfo}`;
      }).join('\n');

      // Build nesting instructions based on available components
      const nestingSection = nestableComponents.length > 0
        ? `
COMPONENTS THAT SUPPORT NESTING (have "children" prop):
${nestableComponents.map(n => `  - ${n}`).join('\n')}

These components can contain other components via the "children" prop:
- String content: "children": "Hello world"
- Single child: "children": { "componentName": "...", "props": {...} }
- Multiple children: "children": [{ "componentName": "...", "props": {...} }, ...]`
        : '';

      const leafSection = leafComponents.length > 0
        ? `
LEAF COMPONENTS (cannot contain other components):
${leafComponents.map(n => `  - ${n}`).join('\n')}

These components do NOT have a "children" prop. Use their specific props (like "label", "text", etc.).`
        : '';

      return `You are a Design System UI Builder. Create UI using the components below.

AVAILABLE COMPONENTS:
${componentSummaries}
${nestingSection}
${leafSection}

IMPORTANT RULES:
1. Return exactly ONE component (use a container component if combining multiple)
2. Only components marked [supports children] can contain other components
3. For leaf components, use their specific content props (label, text, title, etc.)
4. Only include props that differ from defaults

EXAMPLE - If Card supports children and Button doesn't:
User asks: "A card with a button inside"
{
  "componentName": "Card",
  "props": {
    "title": "My Card",
    "children": {
      "componentName": "Button",
      "props": { "label": "Click me" }
    }
  }
}`;
    },
  };
}

/**
 * Check if a value looks like a nested component definition
 */
function isNestedComponent(value: unknown): value is NestedComponentProps {
  return (
    typeof value === 'object' &&
    value !== null &&
    'componentName' in value &&
    typeof (value as NestedComponentProps).componentName === 'string'
  );
}

/**
 * Recursively render a component tree from Tambo's generated props
 * Uses explicit JSX children syntax for proper nesting: <Component>{children}</Component>
 */
function renderComponentTree(
  componentData: NestedComponentProps,
  componentRegistry: Map<string, React.ComponentType<Record<string, unknown>>>,
  depth: number = 0,
  keyPrefix: string = 'root'
): React.ReactNode {
  // Safety: prevent infinite recursion
  if (depth > 10) {
    console.warn('[Tambook] Maximum nesting depth (10) exceeded');
    return null;
  }

  const { componentName, props } = componentData;
  const Component = componentRegistry.get(componentName);

  if (!Component) {
    return (
      <div style={{ padding: '8px', color: '#e74c3c', fontSize: '12px', border: '1px dashed #e74c3c', borderRadius: '4px' }}>
        Component "{componentName}" not found in registry
      </div>
    );
  }

  // Separate children from other props
  const { children: childrenProp, ...otherProps } = props;

  // Process non-children props (some might contain nested components)
  const processedProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(otherProps)) {
    if (isNestedComponent(value)) {
      // Prop that is a component (e.g., icon, header, footer)
      processedProps[key] = renderComponentTree(value, componentRegistry, depth + 1, `${keyPrefix}-${key}`);
    } else {
      processedProps[key] = value;
    }
  }

  // Process children separately for explicit JSX nesting
  let renderedChildren: React.ReactNode = null;

  if (childrenProp !== undefined) {
    if (typeof childrenProp === 'string' || typeof childrenProp === 'number') {
      // Text or number content
      renderedChildren = childrenProp;
    } else if (Array.isArray(childrenProp)) {
      // Array of children (mixed strings, numbers, and components)
      renderedChildren = childrenProp.map((child, index) => {
        if (typeof child === 'string' || typeof child === 'number') {
          return <React.Fragment key={`${keyPrefix}-text-${index}`}>{child}</React.Fragment>;
        } else if (isNestedComponent(child)) {
          return renderComponentTree(child, componentRegistry, depth + 1, `${keyPrefix}-${index}`);
        }
        return null;
      });
    } else if (isNestedComponent(childrenProp)) {
      // Single nested component
      renderedChildren = renderComponentTree(childrenProp, componentRegistry, depth + 1, `${keyPrefix}-child`);
    } else {
      // Other types (React nodes, etc.)
      renderedChildren = childrenProp as React.ReactNode;
    }
  }

  // Render with explicit children syntax: <Component props>{children}</Component>
  return (
    <Component key={`${keyPrefix}-${componentName}-${depth}`} {...processedProps}>
      {renderedChildren}
    </Component>
  );
}

// Inline styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '700px',
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
    minWidth: '350px',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px',
  },
  messageBubbleUser: {
    maxWidth: '85%',
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
    maxWidth: '85%',
    marginBottom: '16px',
    padding: '12px 16px',
    borderRadius: '12px',
    marginRight: 'auto',
    backgroundColor: '#f0f0f0',
    color: '#333',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  generatedComponentContainer: {
    marginTop: '12px',
    borderRadius: '8px',
    border: '1px solid #e6e6e6',
    overflow: 'hidden',
  },
  componentPreviewHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#f8f8f8',
    borderBottom: '1px solid #e6e6e6',
  },
  componentTag: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#029CFD',
    backgroundColor: 'rgba(2, 156, 253, 0.1)',
    borderRadius: '4px',
  },
  toggleButton: {
    padding: '4px 8px',
    fontSize: '11px',
    color: '#666',
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  componentPreview: {
    padding: '16px',
    backgroundColor: '#fff',
    minHeight: '60px',
  },
  propsDisplay: {
    margin: 0,
    padding: '12px',
    fontSize: '11px',
    color: '#666',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    borderTop: '1px solid #e6e6e6',
    maxHeight: '200px',
    overflowY: 'auto' as const,
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
    width: '220px',
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
  noApiKeyMessage: {
    padding: '24px',
    textAlign: 'center' as const,
    color: '#666',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  errorBoundary: {
    padding: '12px',
    color: '#e74c3c',
    backgroundColor: '#fdf0f0',
    border: '1px solid #f5c6cb',
    borderRadius: '4px',
    fontSize: '12px',
  },
};

/**
 * Error boundary for component rendering
 */
class ComponentErrorBoundary extends React.Component<
  { children: React.ReactNode; componentName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; componentName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.errorBoundary}>
          Error rendering {this.props.componentName}: {this.state.error?.message}
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Component preview with toggle for props view
 */
function GeneratedComponentPreview({
  componentData,
  componentRegistry,
}: {
  componentData: NestedComponentProps;
  componentRegistry: Map<string, React.ComponentType<Record<string, unknown>>>;
}) {
  const [showProps, setShowProps] = useState(false);

  const renderedComponent = useMemo(() => {
    return renderComponentTree(componentData, componentRegistry);
  }, [componentData, componentRegistry]);

  return (
    <div style={styles.generatedComponentContainer}>
      <div style={styles.componentPreviewHeader}>
        <span style={styles.componentTag}>{componentData.componentName}</span>
        <button
          style={styles.toggleButton}
          onClick={() => setShowProps(!showProps)}
        >
          {showProps ? 'Hide Props' : 'Show Props'}
        </button>
      </div>
      <div style={styles.componentPreview}>
        <ComponentErrorBoundary componentName={componentData.componentName}>
          {renderedComponent}
        </ComponentErrorBoundary>
      </div>
      {showProps && (
        <pre style={styles.propsDisplay}>
          {JSON.stringify(componentData.props, null, 2)}
        </pre>
      )}
    </div>
  );
}

/**
 * Inner chat component that uses Tambo context
 */
function DesignSystemChatInner({
  componentTools,
  registeredComponents,
  preparationProgress,
}: {
  componentTools: TamboComponent[];
  registeredComponents: string[];
  preparationProgress: PreparationProgress | null;
}) {
  const { thread, sendThreadMessage, startNewThread } = useTambo();
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build component registry map for rendering
  const componentRegistry = useMemo(() => {
    const registry = new Map<string, React.ComponentType<Record<string, unknown>>>();
    for (const tool of componentTools) {
      if (tool.component) {
        registry.set(tool.name, tool.component as React.ComponentType<Record<string, unknown>>);
      }
    }
    return registry;
  }, [componentTools]);

  // Convert Tambo thread messages to ChatMessage format
  const messages: ChatMessage[] = useMemo(() => {
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

      const tamboComponent = (msg as unknown as Record<string, unknown>).component as {
        componentName?: string;
        props?: Record<string, unknown>;
      } | undefined;

      if (tamboComponent?.componentName) {
        chatMessage.generatedComponent = {
          componentName: tamboComponent.componentName,
          props: tamboComponent.props || {},
        };
      }

      return chatMessage;
    });
  }, [thread]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isGenerating) return;

    const content = inputValue.trim();
    setInputValue('');
    setIsGenerating(true);

    try {
      await sendThreadMessage(content);
    } catch (error) {
      console.error('[Tambook] Failed to send message:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [inputValue, isGenerating, sendThreadMessage]);

  const handleClearThread = useCallback(() => {
    setIsGenerating(false);
    startNewThread();
  }, [startNewThread]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const hasMessages = messages.length > 0;
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
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant}
                  >
                    {msg.content}
                    {msg.generatedComponent && (
                      <GeneratedComponentPreview
                        componentData={msg.generatedComponent}
                        componentRegistry={componentRegistry}
                      />
                    )}
                  </div>
                ))}
                {isGenerating && (
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
                <h3 style={styles.emptyStateTitle}>Design System UI Builder</h3>
                <p style={styles.emptyStateText}>
                  Build complete UIs by combining components. Describe what you want
                  and I'll compose the right components together - including nested
                  structures like buttons inside cards, badges in headers, and more.
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
                    ? 'Describe the UI you want to build (e.g., "A card with a badge and action button")...'
                    : 'Loading components...'
                }
                disabled={!isReady || isGenerating}
                rows={1}
              />
              <button
                style={!isReady || isGenerating || !inputValue.trim()
                  ? styles.sendButtonDisabled
                  : styles.sendButton}
                onClick={handleSendMessage}
                disabled={!isReady || isGenerating || !inputValue.trim()}
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

/**
 * Design System Chat - Preview-compatible component for MDX pages
 * This component embeds its own TamboProvider and handles AI messages directly.
 * Supports nested component generation up to 10 levels deep.
 */
export function DesignSystemChat() {
  const [registeredComponents, setRegisteredComponents] = useState<string[]>([]);
  const [preparationProgress, setPreparationProgress] = useState<PreparationProgress | null>(null);
  const [componentTools, setComponentTools] = useState<TamboComponent[]>([]);
  const [apiConfig, setApiConfig] = useState(() => getConfig());
  const channelRef = useRef(addons.getChannel());

  // Set up channel listeners for component preparation
  useEffect(() => {
    const channel = channelRef.current;

    const handleProgress = (payload: PreparationProgress) => {
      setPreparationProgress(payload);
    };

    const handleReady = (payload: { components: string[] }) => {
      setPreparationProgress(null);
      setRegisteredComponents(payload.components);

      // Re-check config (it may have been set during preparation)
      setApiConfig(getConfig());

      // Get component tools from the registry
      const allComponents = globalComponentRegistry.getAll();
      const tools: TamboComponent[] = allComponents.map((c) => ({
        name: c.name,
        description: c.description,
        component: c.component,
        propsSchema: c.propsSchema,
      }));
      setComponentTools(tools);
    };

    channel.on(EVENTS.PREPARATION_PROGRESS, handleProgress);
    channel.on(EVENTS.ALL_COMPONENTS_READY, handleReady);

    // Request current components on mount
    channel.emit(EVENTS.REQUEST_COMPONENTS);

    return () => {
      channel.off(EVENTS.PREPARATION_PROGRESS, handleProgress);
      channel.off(EVENTS.ALL_COMPONENTS_READY, handleReady);
    };
  }, []);

  const { apiKey, apiUrl } = apiConfig;

  // Show message if no API key
  if (!apiKey) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.title}>Design System Chat</h2>
        </div>
        <div style={styles.noApiKeyMessage}>
          <p>
            <strong>API key not configured.</strong>
          </p>
          <p>
            Please visit a component story first to initialize the Tambook configuration,
            or ensure your API key is set in your Storybook parameters.
          </p>
        </div>
      </div>
    );
  }

  // Build context helpers for design system mode
  const allComponentsInfo = componentTools.map((c) => ({
    name: c.name,
    description: c.description,
    propsSchema: c.propsSchema as Record<string, unknown> | undefined,
  }));
  const contextHelpers = buildDesignSystemContextHelpers(allComponentsInfo);

  return (
    <TamboProvider
      tamboUrl={apiUrl}
      apiKey={apiKey}
      components={componentTools}
      contextHelpers={contextHelpers}
    >
      <DesignSystemChatInner
        componentTools={componentTools}
        registeredComponents={registeredComponents}
        preparationProgress={preparationProgress}
      />
    </TamboProvider>
  );
}
