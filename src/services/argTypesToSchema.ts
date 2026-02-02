import type { JSONSchema7, JSONSchema7TypeName } from 'json-schema';

/**
 * Storybook InputType structure (simplified for our needs)
 */
export interface ArgType {
  name?: string;
  description?: string;
  type?: {
    name?: string;
    required?: boolean;
  };
  control?: {
    type?: string;
    min?: number;
    max?: number;
    step?: number;
  } | string | false;
  options?: unknown[];
  table?: {
    type?: { summary?: string };
    defaultValue?: { summary?: string };
    category?: string;
  };
}

/**
 * Convert a single Storybook argType to a JSON Schema property
 */
function argTypeToSchemaProperty(argType: ArgType): JSONSchema7 {
  const schema: JSONSchema7 = {};

  // Add description if available
  if (argType.description) {
    schema.description = argType.description;
  }

  // Handle control-based type inference
  const controlType = typeof argType.control === 'object' ? argType.control?.type : argType.control;

  // If control is explicitly disabled (false), skip serialization
  if (argType.control === false) {
    schema.type = 'null' as JSONSchema7TypeName;
    schema.description = (schema.description || '') + ' (non-serializable)';
    return schema;
  }

  switch (controlType) {
    case 'text':
    case 'color':
      schema.type = 'string';
      break;

    case 'number':
    case 'range':
      schema.type = 'number';
      if (typeof argType.control === 'object') {
        if (argType.control.min !== undefined) {
          schema.minimum = argType.control.min;
        }
        if (argType.control.max !== undefined) {
          schema.maximum = argType.control.max;
        }
      }
      break;

    case 'boolean':
      schema.type = 'boolean';
      break;

    case 'select':
    case 'radio':
    case 'inline-radio':
      if (argType.options && Array.isArray(argType.options)) {
        // Check if all options are the same type
        const types = new Set(argType.options.map((opt) => typeof opt));
        if (types.size === 1) {
          const optType = types.values().next().value;
          if (optType === 'string') {
            schema.type = 'string';
            schema.enum = argType.options as string[];
          } else if (optType === 'number') {
            schema.type = 'number';
            schema.enum = argType.options as number[];
          } else {
            schema.enum = argType.options as (string | number | boolean | null)[];
          }
        } else {
          schema.enum = argType.options as (string | number | boolean | null)[];
        }
      } else {
        schema.type = 'string';
      }
      break;

    case 'multi-select':
    case 'check':
    case 'inline-check':
      schema.type = 'array';
      if (argType.options && Array.isArray(argType.options)) {
        schema.items = {
          type: 'string',
          enum: argType.options as string[],
        };
      } else {
        schema.items = { type: 'string' };
      }
      break;

    case 'object':
      schema.type = 'object';
      schema.additionalProperties = true;
      break;

    case 'date':
      schema.type = 'string';
      schema.format = 'date-time';
      break;

    case 'file':
      // Files are not serializable for AI generation
      schema.type = 'null' as JSONSchema7TypeName;
      schema.description = (schema.description || '') + ' (file input - non-serializable)';
      break;

    default:
      // Fall back to type inference from argType.type
      if (argType.type?.name) {
        schema.type = inferTypeFromName(argType.type.name);
      } else {
        // Default to string if we can't determine the type
        schema.type = 'string';
      }
  }

  return schema;
}

/**
 * Infer JSON Schema type from Storybook type name
 */
function inferTypeFromName(typeName: string): JSONSchema7TypeName | JSONSchema7TypeName[] {
  const normalizedType = typeName.toLowerCase();

  // Handle union types (e.g., "string | number")
  if (normalizedType.includes('|')) {
    const types = normalizedType.split('|').map((t) => t.trim());
    const schemaTypes: JSONSchema7TypeName[] = [];
    for (const t of types) {
      const inferred = inferSingleType(t);
      if (inferred && !schemaTypes.includes(inferred)) {
        schemaTypes.push(inferred);
      }
    }
    return schemaTypes.length === 1 ? schemaTypes[0] : schemaTypes;
  }

  return inferSingleType(normalizedType) || 'string';
}

/**
 * Infer a single JSON Schema type from a type name
 */
function inferSingleType(typeName: string): JSONSchema7TypeName | null {
  switch (typeName) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
    case 'bool':
      return 'boolean';
    case 'object':
      return 'object';
    case 'array':
      return 'array';
    case 'null':
    case 'undefined':
      return 'null';
    case 'function':
    case 'symbol':
      // These are not serializable
      return null;
    default:
      // Check for React-specific types
      if (
        typeName.includes('reactnode') ||
        typeName.includes('element') ||
        typeName.includes('jsx')
      ) {
        return null;
      }
      return null;
  }
}

/**
 * Check if a prop type should be skipped (non-serializable)
 */
function shouldSkipProp(argType: ArgType): boolean {
  const typeName = argType.type?.name?.toLowerCase() || '';

  // Skip function types
  if (typeName.includes('function') || typeName.startsWith('(')) {
    return true;
  }

  // Skip React-specific types that can't be generated by AI
  if (
    typeName.includes('reactnode') ||
    typeName.includes('element') ||
    typeName.includes('jsx') ||
    typeName.includes('ref')
  ) {
    return true;
  }

  // Skip symbol types
  if (typeName === 'symbol') {
    return true;
  }

  return false;
}

/**
 * Convert Storybook argTypes to JSON Schema
 *
 * @param argTypes - Record of Storybook argTypes from story context
 * @returns JSON Schema representing the component props
 */
export function argTypesToJsonSchema(
  argTypes: Record<string, ArgType> | undefined
): JSONSchema7 {
  const schema: JSONSchema7 = {
    type: 'object',
    properties: {},
    required: [],
  };

  if (!argTypes) {
    return schema;
  }

  for (const [propName, argType] of Object.entries(argTypes)) {
    // Skip non-serializable props
    if (shouldSkipProp(argType)) {
      continue;
    }

    const propSchema = argTypeToSchemaProperty(argType);

    // Only add if we got a valid schema (not null type from non-serializable)
    if (propSchema.type !== 'null' || propSchema.enum) {
      schema.properties![propName] = propSchema;

      // Mark as required if specified
      if (argType.type?.required) {
        (schema.required as string[]).push(propName);
      }
    }
  }

  return schema;
}
