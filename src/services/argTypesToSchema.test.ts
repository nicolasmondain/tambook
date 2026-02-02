import { describe, it, expect } from 'vitest';
import { argTypesToJsonSchema, type ArgType } from './argTypesToSchema';

describe('argTypesToJsonSchema', () => {
  it('returns empty schema for undefined argTypes', () => {
    const schema = argTypesToJsonSchema(undefined);

    expect(schema).toEqual({
      type: 'object',
      properties: {},
      required: [],
    });
  });

  it('returns empty schema for empty argTypes', () => {
    const schema = argTypesToJsonSchema({});

    expect(schema).toEqual({
      type: 'object',
      properties: {},
      required: [],
    });
  });

  describe('text control', () => {
    it('converts text control to string type', () => {
      const argTypes: Record<string, ArgType> = {
        label: {
          control: { type: 'text' },
          description: 'Button label',
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.label).toEqual({
        type: 'string',
        description: 'Button label',
      });
    });

    it('converts color control to string type', () => {
      const argTypes: Record<string, ArgType> = {
        color: {
          control: { type: 'color' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.color).toEqual({
        type: 'string',
      });
    });
  });

  describe('number controls', () => {
    it('converts number control to number type', () => {
      const argTypes: Record<string, ArgType> = {
        count: {
          control: { type: 'number' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.count).toEqual({
        type: 'number',
      });
    });

    it('converts range control with min/max to number type', () => {
      const argTypes: Record<string, ArgType> = {
        progress: {
          control: { type: 'range', min: 0, max: 100 },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.progress).toEqual({
        type: 'number',
        minimum: 0,
        maximum: 100,
      });
    });
  });

  describe('boolean control', () => {
    it('converts boolean control to boolean type', () => {
      const argTypes: Record<string, ArgType> = {
        disabled: {
          control: { type: 'boolean' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.disabled).toEqual({
        type: 'boolean',
      });
    });
  });

  describe('select controls', () => {
    it('converts select control with options to enum', () => {
      const argTypes: Record<string, ArgType> = {
        variant: {
          control: { type: 'select' },
          options: ['primary', 'secondary', 'danger'],
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.variant).toEqual({
        type: 'string',
        enum: ['primary', 'secondary', 'danger'],
      });
    });

    it('converts radio control with options to enum', () => {
      const argTypes: Record<string, ArgType> = {
        size: {
          control: { type: 'radio' },
          options: ['small', 'medium', 'large'],
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.size).toEqual({
        type: 'string',
        enum: ['small', 'medium', 'large'],
      });
    });

    it('handles number options in select', () => {
      const argTypes: Record<string, ArgType> = {
        level: {
          control: { type: 'select' },
          options: [1, 2, 3, 4, 5],
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.level).toEqual({
        type: 'number',
        enum: [1, 2, 3, 4, 5],
      });
    });
  });

  describe('multi-select controls', () => {
    it('converts multi-select control to array with enum', () => {
      const argTypes: Record<string, ArgType> = {
        tags: {
          control: { type: 'multi-select' },
          options: ['react', 'typescript', 'storybook'],
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.tags).toEqual({
        type: 'array',
        items: {
          type: 'string',
          enum: ['react', 'typescript', 'storybook'],
        },
      });
    });

    it('converts check control to array', () => {
      const argTypes: Record<string, ArgType> = {
        features: {
          control: { type: 'check' },
          options: ['dark-mode', 'rtl', 'animations'],
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.features).toEqual({
        type: 'array',
        items: {
          type: 'string',
          enum: ['dark-mode', 'rtl', 'animations'],
        },
      });
    });
  });

  describe('object control', () => {
    it('converts object control to object type', () => {
      const argTypes: Record<string, ArgType> = {
        style: {
          control: { type: 'object' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.style).toEqual({
        type: 'object',
        additionalProperties: true,
      });
    });
  });

  describe('date control', () => {
    it('converts date control to string with date-time format', () => {
      const argTypes: Record<string, ArgType> = {
        createdAt: {
          control: { type: 'date' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.createdAt).toEqual({
        type: 'string',
        format: 'date-time',
      });
    });
  });

  describe('required properties', () => {
    it('marks required properties in schema', () => {
      const argTypes: Record<string, ArgType> = {
        label: {
          control: { type: 'text' },
          type: { name: 'string', required: true },
        },
        disabled: {
          control: { type: 'boolean' },
          type: { name: 'boolean', required: false },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.required).toContain('label');
      expect(schema.required).not.toContain('disabled');
    });
  });

  describe('non-serializable types', () => {
    it('skips function props', () => {
      const argTypes: Record<string, ArgType> = {
        onClick: {
          control: false,
          type: { name: 'function' },
        },
        label: {
          control: { type: 'text' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.onClick).toBeUndefined();
      expect(schema.properties?.label).toBeDefined();
    });

    it('skips ReactNode props', () => {
      const argTypes: Record<string, ArgType> = {
        children: {
          control: false,
          type: { name: 'ReactNode' },
        },
        title: {
          control: { type: 'text' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.children).toBeUndefined();
      expect(schema.properties?.title).toBeDefined();
    });

    it('skips ref props', () => {
      const argTypes: Record<string, ArgType> = {
        ref: {
          control: false,
          type: { name: 'Ref<HTMLButtonElement>' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.ref).toBeUndefined();
    });
  });

  describe('type inference fallback', () => {
    it('infers type from argType.type.name when control is not specified', () => {
      const argTypes: Record<string, ArgType> = {
        count: {
          type: { name: 'number' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.count).toEqual({
        type: 'number',
      });
    });

    it('handles union types', () => {
      const argTypes: Record<string, ArgType> = {
        value: {
          type: { name: 'string | number' },
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.value).toEqual({
        type: ['string', 'number'],
      });
    });
  });

  describe('string shorthand control', () => {
    it('handles string shorthand for control type', () => {
      const argTypes: Record<string, ArgType> = {
        label: {
          control: 'text',
        },
      };

      const schema = argTypesToJsonSchema(argTypes);

      expect(schema.properties?.label).toEqual({
        type: 'string',
      });
    });
  });
});
