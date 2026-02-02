import { describe, it, expect, beforeEach } from 'vitest';
import React, { type ComponentType } from 'react';
import {
  extractComponentFromContext,
  ComponentRegistry,
  globalComponentRegistry,
  type StoryContext,
} from './componentExtractor';

// Mock component for testing - cast to ComponentType<unknown> for test compatibility
const MockButton: ComponentType<unknown> = (({ label }: { label?: string }) =>
  React.createElement('button', null, label)) as ComponentType<unknown>;

describe('extractComponentFromContext', () => {
  it('returns null when component is not provided', () => {
    const context: StoryContext = {
      title: 'Components/Button',
    };

    const result = extractComponentFromContext(context);

    expect(result).toBeNull();
  });

  it('returns null when autoExtract is disabled', () => {
    const context: StoryContext = {
      title: 'Components/Button',
      component: MockButton,
      parameters: {
        tambook: {
          autoExtract: false,
        },
      },
    };

    const result = extractComponentFromContext(context);

    expect(result).toBeNull();
  });

  it('extracts component name from title', () => {
    const context: StoryContext = {
      title: 'Components/Button',
      component: MockButton,
    };

    const result = extractComponentFromContext(context);

    expect(result?.name).toBe('Button');
  });

  it('extracts component name from nested title path', () => {
    const context: StoryContext = {
      title: 'Design System/Forms/TextInput',
      component: MockButton,
    };

    const result = extractComponentFromContext(context);

    expect(result?.name).toBe('TextInput');
  });

  it('uses componentId as fallback for name', () => {
    const context: StoryContext = {
      componentId: 'components-button',
      component: MockButton,
    };

    const result = extractComponentFromContext(context);

    expect(result?.name).toBe('Button');
  });

  it('extracts description from docs.description.component', () => {
    const context: StoryContext = {
      title: 'Components/Button',
      component: MockButton,
      parameters: {
        docs: {
          description: {
            component: 'A customizable button component',
          },
        },
      },
    };

    const result = extractComponentFromContext(context);

    expect(result?.description).toBe('A customizable button component');
  });

  it('generates default description when not provided', () => {
    const context: StoryContext = {
      title: 'Components/Button',
      component: MockButton,
    };

    const result = extractComponentFromContext(context);

    expect(result?.description).toBe('A Button component');
  });

  it('includes the component reference', () => {
    const context: StoryContext = {
      title: 'Components/Button',
      component: MockButton,
    };

    const result = extractComponentFromContext(context);

    expect(result?.component).toBe(MockButton);
  });

  it('generates propsSchema from argTypes', () => {
    const context: StoryContext = {
      title: 'Components/Button',
      component: MockButton,
      argTypes: {
        label: {
          control: { type: 'text' },
          description: 'Button text',
        },
        disabled: {
          control: { type: 'boolean' },
        },
      },
    };

    const result = extractComponentFromContext(context);

    expect(result?.propsSchema).toEqual({
      type: 'object',
      properties: {
        label: {
          type: 'string',
          description: 'Button text',
        },
        disabled: {
          type: 'boolean',
        },
      },
      required: [],
    });
  });

  it('generates empty propsSchema when argTypes is undefined', () => {
    const context: StoryContext = {
      title: 'Components/Button',
      component: MockButton,
    };

    const result = extractComponentFromContext(context);

    expect(result?.propsSchema).toEqual({
      type: 'object',
      properties: {},
      required: [],
    });
  });
});

describe('ComponentRegistry', () => {
  let registry: ComponentRegistry;

  beforeEach(() => {
    registry = new ComponentRegistry();
  });

  it('registers a new component', () => {
    const component = {
      name: 'Button',
      description: 'A button',
      component: MockButton,
      propsSchema: { type: 'object' as const, properties: {} },
    };

    const result = registry.register(component);

    expect(result).toBe(true);
    expect(registry.has('Button')).toBe(true);
  });

  it('returns false when registering duplicate component', () => {
    const component = {
      name: 'Button',
      description: 'A button',
      component: MockButton,
      propsSchema: { type: 'object' as const, properties: {} },
    };

    registry.register(component);
    const result = registry.register(component);

    expect(result).toBe(false);
    expect(registry.size).toBe(1);
  });

  it('returns all registered components', () => {
    const button = {
      name: 'Button',
      description: 'A button',
      component: MockButton,
      propsSchema: { type: 'object' as const, properties: {} },
    };
    const input = {
      name: 'Input',
      description: 'An input',
      component: MockButton,
      propsSchema: { type: 'object' as const, properties: {} },
    };

    registry.register(button);
    registry.register(input);

    const all = registry.getAll();

    expect(all).toHaveLength(2);
    expect(all).toContainEqual(button);
    expect(all).toContainEqual(input);
  });

  it('returns component names', () => {
    registry.register({
      name: 'Button',
      description: 'A button',
      component: MockButton,
      propsSchema: { type: 'object' as const, properties: {} },
    });
    registry.register({
      name: 'Input',
      description: 'An input',
      component: MockButton,
      propsSchema: { type: 'object' as const, properties: {} },
    });

    const names = registry.getNames();

    expect(names).toEqual(['Button', 'Input']);
  });

  it('clears all components', () => {
    registry.register({
      name: 'Button',
      description: 'A button',
      component: MockButton,
      propsSchema: { type: 'object' as const, properties: {} },
    });

    registry.clear();

    expect(registry.size).toBe(0);
    expect(registry.getAll()).toEqual([]);
  });
});

describe('globalComponentRegistry', () => {
  beforeEach(() => {
    globalComponentRegistry.clear();
  });

  it('is a singleton instance', () => {
    globalComponentRegistry.register({
      name: 'TestComponent',
      description: 'Test',
      component: MockButton,
      propsSchema: { type: 'object', properties: {} },
    });

    expect(globalComponentRegistry.has('TestComponent')).toBe(true);
  });
});
