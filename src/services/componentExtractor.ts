import type { JSONSchema7 } from 'json-schema';
import type { ComponentType } from 'react';
import { argTypesToJsonSchema, type ArgType } from './argTypesToSchema';

/**
 * Storybook story context structure (simplified for our needs)
 */
export interface StoryContext {
  /** Component title path, e.g., "Components/Button" */
  title?: string;
  /** Component name, e.g., "Button" */
  name?: string;
  /** The React component being rendered */
  component?: ComponentType<unknown>;
  /** ArgTypes metadata for the component */
  argTypes?: Record<string, ArgType>;
  /** Story parameters */
  parameters?: {
    docs?: {
      description?: {
        component?: string;
        story?: string;
      };
    };
    tambook?: {
      /** Disable auto-extraction for this story */
      autoExtract?: boolean;
    };
  };
  /** Component ID */
  componentId?: string;
}

/**
 * Extracted component metadata compatible with TamboComponent
 */
export interface ExtractedComponent {
  /** Display name of the component */
  name: string;
  /** Description for the AI */
  description: string;
  /** The React component */
  component: ComponentType<unknown>;
  /** JSON Schema for component props */
  propsSchema: JSONSchema7;
}

/**
 * Extract the component name from the story title
 * e.g., "Components/Button" -> "Button"
 * e.g., "Design System/Forms/Input" -> "Input"
 */
function extractComponentName(context: StoryContext): string {
  // Use name if available, otherwise extract from title
  if (context.name && context.name !== 'Default') {
    // name is often the story name, not component name
    // Use title for component name
  }

  if (context.title) {
    const parts = context.title.split('/');
    return parts[parts.length - 1];
  }

  if (context.componentId) {
    // componentId is like "components-button"
    const parts = context.componentId.split('-');
    const lastName = parts[parts.length - 1];
    // Capitalize first letter
    return lastName.charAt(0).toUpperCase() + lastName.slice(1);
  }

  return 'UnknownComponent';
}

/**
 * Extract description from story context
 */
function extractDescription(context: StoryContext): string {
  // Try docs description first
  const docsDescription = context.parameters?.docs?.description?.component;
  if (docsDescription) {
    return docsDescription;
  }

  // Fall back to a generic description based on the component name
  const name = extractComponentName(context);
  return `A ${name} component`;
}

/**
 * Extract component metadata from Storybook story context
 *
 * @param context - Storybook story context
 * @returns Extracted component metadata or null if extraction fails
 */
export function extractComponentFromContext(
  context: StoryContext
): ExtractedComponent | null {
  // Check if auto-extraction is disabled
  if (context.parameters?.tambook?.autoExtract === false) {
    return null;
  }

  // Must have a component to extract
  if (!context.component) {
    return null;
  }

  const name = extractComponentName(context);
  const description = extractDescription(context);
  const propsSchema = argTypesToJsonSchema(context.argTypes);

  return {
    name,
    description,
    component: context.component,
    propsSchema,
  };
}

/**
 * Registry for tracking auto-discovered components to avoid duplicates
 */
export class ComponentRegistry {
  private components = new Map<string, ExtractedComponent>();

  /**
   * Register a component, returns true if it was newly added
   */
  register(component: ExtractedComponent): boolean {
    if (this.components.has(component.name)) {
      return false;
    }
    this.components.set(component.name, component);
    return true;
  }

  /**
   * Check if a component is already registered
   */
  has(name: string): boolean {
    return this.components.has(name);
  }

  /**
   * Get all registered components
   */
  getAll(): ExtractedComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get component names
   */
  getNames(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Clear all registered components
   */
  clear(): void {
    this.components.clear();
  }

  /**
   * Get count of registered components
   */
  get size(): number {
    return this.components.size;
  }
}

/**
 * Global registry instance for tracking discovered components across stories
 */
export const globalComponentRegistry = new ComponentRegistry();
