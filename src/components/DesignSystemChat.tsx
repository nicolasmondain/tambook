import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { addons } from 'storybook/internal/preview-api';
import { TamboProvider, useTambo, useTamboContextAttachment, type TamboComponent } from '@tambo-ai/react';
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

/**
 * Information about a component for building combinations
 */
interface ComponentInfo {
  name: string;
  description: string;
  component: React.ComponentType<Record<string, unknown>>;
  propsSchema?: Record<string, unknown>;
  isNestable: boolean;
}

/**
 * Node in a component tree structure for building nested combinations
 */
interface ComponentNode {
  component: ComponentInfo;
  children: ComponentNode[];
  prefix: string; // Prefix for props (e.g., "outer_", "inner_", "leaf_")
}

/**
 * Get a human-readable structure description
 */
function describeStructure(node: ComponentNode, depth: number = 0): string {
  const indent = '  '.repeat(depth);
  const childDescriptions = node.children.map(c => describeStructure(c, depth + 1)).join('');
  if (node.children.length === 0) {
    return `${indent}<${node.component.name} />\n`;
  }
  return `${indent}<${node.component.name}>\n${childDescriptions}${indent}</${node.component.name}>\n`;
}

/**
 * Build a flat props schema from a component tree
 */
function buildFlatPropsSchema(node: ComponentNode): Record<string, unknown> {
  const properties: Record<string, unknown> = {};

  // Add this node's props with prefix
  const nodeProps = node.component.propsSchema?.properties as Record<string, unknown> | undefined;
  if (nodeProps) {
    for (const [key, value] of Object.entries(nodeProps)) {
      if (key === 'children') continue;
      const prefixedKey = node.prefix ? `${node.prefix}${key}` : key;
      properties[prefixedKey] = value;
    }
  }

  // Recursively add children's props
  for (const child of node.children) {
    const childProps = buildFlatPropsSchema(child);
    Object.assign(properties, childProps);
  }

  return properties;
}

/**
 * Build the actual React component from a component tree
 */
function buildCombinedComponent(tree: ComponentNode): React.FC<Record<string, unknown>> {
  return function CombinedComponent(props: Record<string, unknown>) {
    return renderNode(tree, props);
  };
}

/**
 * Recursively render a component node with its children
 */
function renderNode(node: ComponentNode, allProps: Record<string, unknown>): React.ReactElement {
  const Component = node.component.component;

  // Extract props for this node based on prefix
  const nodeProps: Record<string, unknown> = {};
  const nodePropsSchema = node.component.propsSchema?.properties as Record<string, unknown> | undefined;

  if (nodePropsSchema) {
    for (const key of Object.keys(nodePropsSchema)) {
      if (key === 'children') continue;
      const prefixedKey = node.prefix ? `${node.prefix}${key}` : key;
      if (prefixedKey in allProps) {
        nodeProps[key] = allProps[prefixedKey];
      }
    }
  }

  // Render children recursively
  const renderedChildren = node.children.map((child, index) =>
    React.cloneElement(renderNode(child, allProps), { key: index })
  );

  return (
    <Component {...nodeProps}>
      {renderedChildren.length > 0 ? renderedChildren : undefined}
    </Component>
  );
}

/**
 * Generate explicit prop examples for description
 */
function generatePropExamples(node: ComponentNode): string[] {
  const examples: string[] = [];
  const nodeProps = node.component.propsSchema?.properties as Record<string, unknown> | undefined;

  if (nodeProps) {
    const propKeys = Object.keys(nodeProps).filter(k => k !== 'children').slice(0, 2);
    for (const key of propKeys) {
      const prefixedKey = node.prefix ? `${node.prefix}${key}` : key;
      examples.push(prefixedKey);
    }
  }

  for (const child of node.children) {
    examples.push(...generatePropExamples(child));
  }

  return examples;
}

/**
 * Generate all useful component combinations as flattened TamboComponents.
 * Creates up to 3 levels of nesting with explicit naming and descriptions.
 */
function generateComponentCombinations(
  components: ComponentInfo[]
): TamboComponent[] {
  const combinations: TamboComponent[] = [];

  const nestableComponents = components.filter(c => c.isNestable);
  const leafComponents = components.filter(c => !c.isNestable);

  // LEVEL 1: Container > Leaf (e.g., Card_containing_Button)
  for (const container of nestableComponents) {
    for (const leaf of leafComponents) {
      const tree: ComponentNode = {
        component: container,
        prefix: '',
        children: [{
          component: leaf,
          prefix: `${leaf.name.toLowerCase()}_`,
          children: [],
        }],
      };

      const name = `${container.name}_containing_${leaf.name}`;
      combinations.push(createCombinationFromTree(name, tree, 1));
    }
  }

  // LEVEL 1: Container > Multiple Leaves (e.g., Card_containing_Text_and_Button)
  for (const container of nestableComponents) {
    for (let i = 0; i < leafComponents.length; i++) {
      for (let j = i + 1; j < leafComponents.length; j++) {
        const leaf1 = leafComponents[i];
        const leaf2 = leafComponents[j];

        const tree: ComponentNode = {
          component: container,
          prefix: '',
          children: [
            { component: leaf1, prefix: `${leaf1.name.toLowerCase()}_`, children: [] },
            { component: leaf2, prefix: `${leaf2.name.toLowerCase()}_`, children: [] },
          ],
        };

        const name = `${container.name}_containing_${leaf1.name}_and_${leaf2.name}`;
        combinations.push(createCombinationFromTree(name, tree, 1));
      }
    }
  }

  // LEVEL 2: Container > Container > Leaf (e.g., Card_containing_Stack_containing_Button)
  const primaryContainers = nestableComponents.filter(c =>
    ['Card', 'Alert', 'Accordion'].includes(c.name)
  );
  const secondaryContainers = nestableComponents.filter(c =>
    ['Stack', 'Box', 'List'].includes(c.name)
  );

  for (const outer of primaryContainers) {
    for (const inner of secondaryContainers) {
      for (const leaf of leafComponents) {
        const tree: ComponentNode = {
          component: outer,
          prefix: '',
          children: [{
            component: inner,
            prefix: `${inner.name.toLowerCase()}_`,
            children: [{
              component: leaf,
              prefix: `${leaf.name.toLowerCase()}_`,
              children: [],
            }],
          }],
        };

        const name = `${outer.name}_containing_${inner.name}_containing_${leaf.name}`;
        combinations.push(createCombinationFromTree(name, tree, 2));
      }
    }
  }

  // LEVEL 2: Container > Container > Multiple Leaves
  for (const outer of primaryContainers) {
    for (const inner of secondaryContainers) {
      for (let i = 0; i < leafComponents.length; i++) {
        for (let j = i + 1; j < leafComponents.length; j++) {
          const leaf1 = leafComponents[i];
          const leaf2 = leafComponents[j];

          const tree: ComponentNode = {
            component: outer,
            prefix: '',
            children: [{
              component: inner,
              prefix: `${inner.name.toLowerCase()}_`,
              children: [
                { component: leaf1, prefix: `${leaf1.name.toLowerCase()}_`, children: [] },
                { component: leaf2, prefix: `${leaf2.name.toLowerCase()}_`, children: [] },
              ],
            }],
          };

          const name = `${outer.name}_containing_${inner.name}_containing_${leaf1.name}_and_${leaf2.name}`;
          combinations.push(createCombinationFromTree(name, tree, 2));
        }
      }
    }
  }

  // LEVEL 3: Container > Container > Container > Leaf
  for (const outer of primaryContainers.slice(0, 2)) { // Limit to avoid explosion
    for (const middle of secondaryContainers.slice(0, 2)) {
      for (const inner of secondaryContainers.filter(c => c.name !== middle.name).slice(0, 2)) {
        for (const leaf of leafComponents.slice(0, 3)) { // Most common leaves
          const tree: ComponentNode = {
            component: outer,
            prefix: '',
            children: [{
              component: middle,
              prefix: `${middle.name.toLowerCase()}_`,
              children: [{
                component: inner,
                prefix: `inner${inner.name.toLowerCase()}_`,
                children: [{
                  component: leaf,
                  prefix: `${leaf.name.toLowerCase()}_`,
                  children: [],
                }],
              }],
            }],
          };

          const name = `${outer.name}_containing_${middle.name}_containing_${inner.name}_containing_${leaf.name}`;
          combinations.push(createCombinationFromTree(name, tree, 3));
        }
      }
    }
  }

  // LEVEL 3: Container > Container > Container > Multiple Leaves
  for (const outer of primaryContainers.slice(0, 2)) {
    for (const middle of secondaryContainers.slice(0, 2)) {
      for (const inner of secondaryContainers.filter(c => c.name !== middle.name).slice(0, 1)) {
        for (let i = 0; i < Math.min(leafComponents.length, 3); i++) {
          for (let j = i + 1; j < Math.min(leafComponents.length, 3); j++) {
            const leaf1 = leafComponents[i];
            const leaf2 = leafComponents[j];

            const tree: ComponentNode = {
              component: outer,
              prefix: '',
              children: [{
                component: middle,
                prefix: `${middle.name.toLowerCase()}_`,
                children: [{
                  component: inner,
                  prefix: `inner${inner.name.toLowerCase()}_`,
                  children: [
                    { component: leaf1, prefix: `${leaf1.name.toLowerCase()}_`, children: [] },
                    { component: leaf2, prefix: `${leaf2.name.toLowerCase()}_`, children: [] },
                  ],
                }],
              }],
            };

            const name = `${outer.name}_containing_${middle.name}_containing_${inner.name}_containing_${leaf1.name}_and_${leaf2.name}`;
            combinations.push(createCombinationFromTree(name, tree, 3));
          }
        }
      }
    }
  }

  console.log(`[Tambook] Generated ${combinations.length} component combinations (1-3 levels deep)`);
  return combinations;
}

/**
 * Create a TamboComponent from a component tree
 */
function createCombinationFromTree(
  name: string,
  tree: ComponentNode,
  nestingLevel: number
): TamboComponent {
  const properties = buildFlatPropsSchema(tree);
  const propExamples = generatePropExamples(tree).slice(0, 4);
  const structurePreview = describeStructure(tree).trim();

  // Build explicit description
  const description = `[${nestingLevel}-level nesting] ${name.replace(/_/g, ' ')}

STRUCTURE:
${structurePreview}

PROPS: Use flat props with prefixes. Examples: ${propExamples.join(', ')}
- Root component props: no prefix
- Nested components: use their name as prefix (e.g., stack_direction, button_label)`;

  return {
    name,
    description,
    component: buildCombinedComponent(tree),
    propsSchema: {
      type: 'object',
      properties,
    } as Record<string, unknown>,
  };
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
  componentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  componentName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  nestableBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 500,
    color: '#7c3aed',
    backgroundColor: '#ede9fe',
    borderRadius: '4px',
    cursor: 'help',
    position: 'relative' as const,
  },
  nestableIcon: {
    fontSize: '11px',
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
 * Badge component showing that a component can contain other components
 */
function NestableBadge() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const badgeRef = useRef<HTMLSpanElement>(null);

  const handleMouseEnter = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 8, // Position above the badge
        left: rect.left + rect.width / 2, // Center horizontally
      });
    }
    setShowTooltip(true);
  };

  return (
    <span
      ref={badgeRef}
      style={styles.nestableBadge}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span style={styles.nestableIcon}>&#123;&#125;</span>
      nestable
      {showTooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: 'translate(-50%, -100%)',
            padding: '6px 10px',
            fontSize: '11px',
            color: '#fff',
            backgroundColor: '#333',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            zIndex: 10000,
            pointerEvents: 'none',
          }}
        >
          Can contain other components as children
        </div>
      )}
    </span>
  );
}

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
 * Build a context string that helps the AI understand how to select components
 */
function buildComponentSelectionGuide(componentTools: TamboComponent[]): string {
  // Separate base components from combinations
  const baseComponents = componentTools.filter(c => !c.name.includes('_containing_'));
  const combinations = componentTools.filter(c => c.name.includes('_containing_'));

  // Group combinations by nesting level
  const level1 = combinations.filter(c => (c.name.match(/_containing_/g) || []).length === 1);
  const level2 = combinations.filter(c => (c.name.match(/_containing_/g) || []).length === 2);
  const level3 = combinations.filter(c => (c.name.match(/_containing_/g) || []).length >= 3);

  return `# DESIGN SYSTEM COMPONENT SELECTION GUIDE

You are a UI builder assistant. Your job is to select the RIGHT component tool to generate UI based on user requests.

## IMPORTANT RULES:
1. ALWAYS choose a PRE-BUILT combination that matches the user's request structure
2. The component name describes the EXACT nesting structure (e.g., "Card_containing_Stack_containing_Button")
3. Use FLAT props with prefixes - NO nested objects
4. Match the user's request to the closest component structure available

## AVAILABLE BASE COMPONENTS (single, no nesting):
${baseComponents.map(c => `- ${c.name}`).join('\n')}

## AVAILABLE COMBINATIONS BY NESTING DEPTH:

### 1-LEVEL NESTING (Container > Child):
${level1.slice(0, 20).map(c => `- ${c.name}`).join('\n')}
${level1.length > 20 ? `... and ${level1.length - 20} more` : ''}

### 2-LEVEL NESTING (Container > Container > Child):
${level2.slice(0, 15).map(c => `- ${c.name}`).join('\n')}
${level2.length > 15 ? `... and ${level2.length - 15} more` : ''}

### 3-LEVEL NESTING (Container > Container > Container > Child):
${level3.slice(0, 10).map(c => `- ${c.name}`).join('\n')}
${level3.length > 10 ? `... and ${level3.length - 10} more` : ''}

## HOW TO SELECT THE RIGHT COMPONENT:

1. **Analyze the user's request** - identify the structure they want
2. **Map to component names** - find the combination that matches
3. **Use flat props with prefixes**:
   - Root component props: no prefix (e.g., \`title\`, \`padding\`)
   - Nested components: use their name as prefix (e.g., \`stack_direction\`, \`button_label\`, \`text_content\`)
   - For 3-level nesting, middle container uses prefix, innermost uses \`inner\` prefix

## EXAMPLES:

User: "Create a card with a button"
→ Use: Card_containing_Button
→ Props: { title: "My Card", button_label: "Click me", button_variant: "primary" }

User: "Make an alert with a title and action button"
→ Use: Alert_containing_Text_and_Button
→ Props: { type: "info", text_content: "Alert message", button_label: "OK" }

User: "Card with a stack of items inside"
→ Use: Card_containing_Stack_containing_Text (or with Button)
→ Props: { title: "Card", stack_direction: "vertical", text_content: "Item" }

User: "Complex layout with card > stack > multiple items"
→ Use: Card_containing_Stack_containing_Text_and_Button
→ Props: { title: "Card", stack_gap: "medium", text_content: "Hello", button_label: "Action" }

REMEMBER: Always use the most specific combination available. If the exact structure isn't available, use the closest match.`;
}

/**
 * Inner chat component that uses Tambo context
 */
function DesignSystemChatInner({
  componentTools,
  registeredComponents,
  preparationProgress,
  componentRegistry,
}: {
  componentTools: TamboComponent[];
  registeredComponents: string[];
  preparationProgress: PreparationProgress | null;
  componentRegistry: Map<string, React.ComponentType<Record<string, unknown>>>;
}) {
  const { thread, sendThreadMessage, startNewThread } = useTambo();
  const { addContextAttachment } = useTamboContextAttachment();
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Build the context guide once when tools are ready
  const contextGuide = useMemo(() => {
    if (componentTools.length === 0) return '';
    return buildComponentSelectionGuide(componentTools);
  }, [componentTools]);

  // Clear thread handler
  const handleClearThreadWithContext = useCallback(() => {
    setIsGenerating(false);
    startNewThread();
  }, [startNewThread]);

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

      // Try to get component from message
      const msgRecord = msg as unknown as Record<string, unknown>;
      const tamboComponent = msgRecord.component as {
        componentName?: string;
        props?: Record<string, unknown>;
      } | undefined;

      if (tamboComponent?.componentName) {
        console.log('[Tambook] Found component:', tamboComponent.componentName, 'with props:', tamboComponent.props);

        // Direct component - Tambo calls the specific combination or base component
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
      // Add context guide before each message (context attachments are one-time use)
      if (contextGuide) {
        addContextAttachment({
          displayName: 'Component Selection Guide',
          context: contextGuide,
          type: 'system-guide',
        });
      }
      await sendThreadMessage(content);
    } catch (error) {
      console.error('[Tambook] Failed to send message:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [inputValue, isGenerating, sendThreadMessage, contextGuide, addContextAttachment]);


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
          <button style={styles.clearButton} onClick={handleClearThreadWithContext}>
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
                  Build UIs with up to 3 levels of nesting. Try requests like
                  "a card with a button" or "an alert containing a stack with text and a badge".
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
          {registeredComponents.map((name) => {
            const tool = componentTools.find((t) => t.name === name);
            const isNestable = tool?.propsSchema
              ? hasChildrenProp(tool.propsSchema as Record<string, unknown>)
              : false;

            return (
              <div key={name} style={styles.componentCard}>
                <div style={styles.componentCardHeader}>
                  <div style={styles.componentName}>{name}</div>
                  {isNestable && (
                    <NestableBadge />
                  )}
                </div>
              </div>
            );
          })}
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

  // Build component registry map for rendering (must be before conditional returns)
  const componentRegistry = useMemo(() => {
    const registry = new Map<string, React.ComponentType<Record<string, unknown>>>();
    for (const tool of componentTools) {
      if (tool.component) {
        registry.set(tool.name, tool.component as React.ComponentType<Record<string, unknown>>);
      }
    }
    return registry;
  }, [componentTools]);

  // Build component info for generating combinations
  const componentInfoList: ComponentInfo[] = useMemo(() => {
    return componentTools
      .filter(c => c.component)
      .map(c => ({
        name: c.name,
        description: c.description,
        component: c.component as React.ComponentType<Record<string, unknown>>,
        propsSchema: c.propsSchema as Record<string, unknown> | undefined,
        isNestable: hasChildrenProp(c.propsSchema as Record<string, unknown> | undefined),
      }));
  }, [componentTools]);

  // Generate all component combinations for Tambo
  const allTamboComponents: TamboComponent[] = useMemo(() => {
    if (componentInfoList.length === 0) return [];

    // Start with base components (original ones)
    const baseComponents: TamboComponent[] = componentTools.map(c => ({
      name: c.name,
      description: c.description,
      component: c.component,
      propsSchema: c.propsSchema,
    }));

    // Generate combinations
    const combinations = generateComponentCombinations(componentInfoList);

    // Add combination components to the registry for rendering
    for (const combo of combinations) {
      if (combo.component) {
        componentRegistry.set(combo.name, combo.component as React.ComponentType<Record<string, unknown>>);
      }
    }

    console.log(`[Tambook] Registered ${baseComponents.length} base components and ${combinations.length} combinations`);

    return [...baseComponents, ...combinations];
  }, [componentInfoList, componentTools, componentRegistry]);

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

  return (
    <TamboProvider
      tamboUrl={apiUrl}
      apiKey={apiKey}
      components={allTamboComponents}
    >
      <DesignSystemChatInner
        componentTools={allTamboComponents}
        registeredComponents={registeredComponents}
        preparationProgress={preparationProgress}
        componentRegistry={componentRegistry}
      />
    </TamboProvider>
  );
}
