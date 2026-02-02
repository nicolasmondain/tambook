# tambook

A Storybook addon that integrates with [Tambo](https://tambo.co/) to enable developers to generate UI components from natural language descriptions directly within Storybook.

## Features

- **Natural Language Component Generation**: Describe components in plain English and let AI generate them
- **Real-time Preview**: See generated components rendered instantly in your Storybook
- **Self-hosted Mode**: No API key required - uses local Tambo backend
- **Component Registration**: Register your components with Zod schemas for type-safe generation
- **Copy Props**: Easily copy generated component props to use in your code
- **Story Export**: Download generated stories as TypeScript files

## Installation

```bash
npm install tambook
# or
yarn add tambook
# or
pnpm add tambook
```

## Setup

### 1. Register the addon

Add `tambook` to your `.storybook/main.ts`:

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  // ... other config
  addons: [
    '@storybook/addon-essentials',
    'tambook',
  ],
};

export default config;
```

### 2. Configure your components

In your `.storybook/preview.ts`, register the components you want to use for generation:

```typescript
import type { Preview } from '@storybook/react';
import { z } from 'zod';
import { Button, Card, Input } from '../src/components';

const preview: Preview = {
  parameters: {
    tambook: {
      // Optional: Custom API URL for self-hosted Tambo
      // apiUrl: 'http://localhost:3030',

      // Register components with their schemas
      components: [
        {
          name: 'Button',
          description: 'A clickable button with style variants',
          component: Button,
          propsSchema: z.object({
            label: z.string().describe('The button text'),
            variant: z.enum(['primary', 'secondary', 'outline']).describe('Visual style'),
            disabled: z.boolean().optional().describe('Whether the button is disabled'),
          }),
        },
        {
          name: 'Card',
          description: 'A container card for content',
          component: Card,
          propsSchema: z.object({
            title: z.string().describe('Card title'),
            children: z.string().describe('Card content'),
          }),
        },
        {
          name: 'Input',
          description: 'A text input field',
          component: Input,
          propsSchema: z.object({
            placeholder: z.string().optional(),
            type: z.enum(['text', 'email', 'password']).default('text'),
          }),
        },
      ],
    },
  },
};

export default preview;
```

### 3. Start Tambo backend (Self-hosted mode)

For local development without an API key, run the Tambo cloud locally:

```bash
npx tambo-cloud
```

This starts a local Tambo server at `http://localhost:3030`.

## Usage

1. Open Storybook and navigate to any story
2. Open the "Tambook" panel in the addons area
3. Type a natural language description of the component you want to generate
4. View the generated component with its props
5. Copy props or download as a story file

### Example Prompts

- "Create a primary button with the label 'Submit'"
- "Make a card with the title 'Welcome' and some placeholder content"
- "Generate an email input with a placeholder 'Enter your email'"

## API Reference

### TambookParameters

Configuration options for the addon:

| Property | Type | Description |
|----------|------|-------------|
| `components` | `TambookComponentConfig[]` | Array of registered components |
| `apiUrl` | `string` | Optional custom Tambo API URL |
| `apiKey` | `string` | Optional API key for cloud-hosted Tambo |

### TambookComponentConfig

Configuration for each registered component:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display name of the component |
| `description` | `string` | Description for the AI to understand the component's purpose |
| `component` | `ComponentType` | The React component |
| `propsSchema` | `ZodSchema` | Zod schema defining the component's props |

## Architecture

Tambook uses Storybook's two-part addon architecture:

- **Manager**: The chat UI panel displayed in Storybook's addon area
- **Preview**: Wraps stories with TamboProvider for AI integration

Communication between Manager and Preview happens via Storybook's channel system.

```
Manager (Chat Panel)  <--channel-->  Preview (TamboProvider)
  - Chat UI                           - AI conversation
  - User input                        - Component generation
  - Display results                   - Render components
```

## Requirements

- Storybook 8.x
- React 18.x
- Zod 3.x (optional, for component schemas)

## Development

```bash
# Install dependencies
npm install

# Build the addon
npm run build

# Watch mode for development
npm run dev

# Run type checking
npm run typecheck

# Run tests
npm test
```

## License

MIT
