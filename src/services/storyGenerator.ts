import type { GeneratedComponent } from '../types';

interface StoryGeneratorOptions {
  /** Name of the generated story */
  storyName?: string;
  /** Import path for the component */
  componentImportPath?: string;
}

/**
 * Generates a Storybook story file from a generated component
 */
export function generateStoryCode(
  component: GeneratedComponent,
  options: StoryGeneratorOptions = {}
): string {
  const {
    storyName = 'Generated',
    componentImportPath = `@/components/${component.componentName}`,
  } = options;

  const propsCode = formatPropsAsCode(component.props);

  return `import type { Meta, StoryObj } from '@storybook/react';
import { ${component.componentName} } from '${componentImportPath}';

const meta = {
  title: 'Generated/${component.componentName}',
  component: ${component.componentName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ${component.componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ${storyName}: Story = {
  args: ${propsCode},
};
`;
}

/**
 * Formats props object as TypeScript code
 */
function formatPropsAsCode(
  props: Record<string, unknown>,
  indent: number = 4
): string {
  const spaces = ' '.repeat(indent);
  const entries = Object.entries(props);

  if (entries.length === 0) {
    return '{}';
  }

  const lines = entries.map(([key, value]) => {
    const formattedValue = formatValue(value, indent + 2);
    return `${spaces}${key}: ${formattedValue},`;
  });

  return `{\n${lines.join('\n')}\n${' '.repeat(indent - 2)}}`;
}

/**
 * Formats a single value as TypeScript code
 */
function formatValue(value: unknown, indent: number): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  switch (typeof value) {
    case 'string':
      return `'${value.replace(/'/g, "\\'")}'`;
    case 'number':
    case 'boolean':
      return String(value);
    case 'object':
      if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.map((v) => formatValue(v, indent + 2));
        return `[${items.join(', ')}]`;
      }
      return formatPropsAsCode(value as Record<string, unknown>, indent + 2);
    default:
      return String(value);
  }
}

/**
 * Downloads the generated story as a file
 */
export function downloadStoryFile(
  component: GeneratedComponent,
  options: StoryGeneratorOptions = {}
): void {
  const code = generateStoryCode(component, options);
  const blob = new Blob([code], { type: 'text/typescript' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${component.componentName}.stories.tsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies the generated story code to clipboard
 */
export async function copyStoryToClipboard(
  component: GeneratedComponent,
  options: StoryGeneratorOptions = {}
): Promise<void> {
  const code = generateStoryCode(component, options);
  await navigator.clipboard.writeText(code);
}
