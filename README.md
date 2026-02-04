# tambook

Talk to your design system.

Built during the [Tambo Hackathon](https://www.wemakedevs.org/hackathons/tambo), tambook connects your Storybook component library with [Tambo](https://tambo.co)'s generative UI. Describe what you want in plain English and see your components come to life—no more hunting through stories or manually tweaking props.

![Tambook Demo](assets/tambook-demo.png)

## Features

- **Zero Configuration**: Automatically discovers components from your Storybook stories
- **Natural Language Component Generation**: Describe components in plain English and let AI generate them
- **Real-time Preview**: See generated components rendered instantly in your Storybook
- **Tambo Cloud or Self-hosted**: Use Tambo Cloud with an API key, or run your own backend
- **Auto-extracted Schemas**: Converts Storybook argTypes to schemas automatically
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

### 2. Configure Tambo API Key

Get your API key at [https://tambo.co](https://tambo.co) and add it to your `.storybook/preview.ts`:

```typescript
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    tambook: {
      // For Vite-based Storybook:
      apiKey: import.meta.env.STORYBOOK_TAMBO_API_KEY,
      // For Webpack-based Storybook:
      // apiKey: process.env.STORYBOOK_TAMBO_API_KEY,
    },
  },
};

export default preview;
```

Create a `.env` file in your Storybook project:

```bash
STORYBOOK_TAMBO_API_KEY=your_api_key_here
```

**That's it!** Tambook automatically discovers your components from Storybook's metadata - no manual configuration needed.

### Self-hosted Mode (Optional)

For self-hosted Tambo deployments, provide a custom API URL:

```typescript
parameters: {
  tambook: {
    apiKey: 'your-api-key',
    apiUrl: 'http://localhost:3211', // Your self-hosted Tambo API
  },
}
```

See [Tambo's self-hosting documentation](https://docs.tambo.co) for backend setup instructions.

## How It Works

Tambook extracts component information from your existing Storybook setup:

- **Component name**: From the story title (e.g., `Components/Button` → `Button`)
- **Description**: From `parameters.docs.description.component`
- **Props schema**: Automatically converted from `argTypes`

```typescript
// Your existing story - no tambook config needed!
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    docs: {
      description: {
        component: 'A clickable button with style variants',
      },
    },
  },
  argTypes: {
    label: { control: 'text', description: 'The button text' },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline'],
    },
    disabled: { control: 'boolean' },
  },
};
```

### ArgTypes to Schema Conversion

| Storybook Control | JSON Schema |
|------------------|-------------|
| `text`, `color` | `{ type: "string" }` |
| `number`, `range` | `{ type: "number", min?, max? }` |
| `boolean` | `{ type: "boolean" }` |
| `select`, `radio` | `{ type: "string", enum: [...] }` |
| `multi-select`, `check` | `{ type: "array", items: { enum } }` |
| `object` | `{ type: "object" }` |
| `date` | `{ type: "string", format: "date-time" }` |

Non-serializable props (functions, ReactNode, refs) are automatically excluded.

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

## Advanced Configuration

### Manual Component Registration (Optional)

If you need more control, you can manually configure components. Manual configuration takes precedence over auto-discovery:

```typescript
import type { Preview } from '@storybook/react';
import { z } from 'zod';
import { Button } from '../src/components';

const preview: Preview = {
  parameters: {
    tambook: {
      components: [
        {
          name: 'Button',
          description: 'A clickable button with style variants',
          component: Button,
          // Use Zod schema for more precise control
          propsSchema: z.object({
            label: z.string().describe('The button text'),
            variant: z.enum(['primary', 'secondary', 'outline']),
            disabled: z.boolean().optional(),
          }),
        },
      ],
    },
  },
};

export default preview;
```

### Disable Auto-Discovery

To disable auto-extraction globally:

```typescript
parameters: {
  tambook: {
    autoExtract: false,
  },
}
```

Or for a specific story:

```typescript
export const MyStory = {
  parameters: {
    tambook: {
      autoExtract: false,
    },
  },
};
```

## API Reference

### TambookParameters

Configuration options for the addon:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `components` | `TambookComponentConfig[]` | `[]` | Manually registered components (takes precedence) |
| `apiKey` | `string` | - | Tambo API key (required). Get yours at https://tambo.co |
| `apiUrl` | `string` | Tambo Cloud | Custom API URL for self-hosted Tambo backend |
| `autoExtract` | `boolean` | `true` | Auto-discover components from stories |

### TambookComponentConfig

Configuration for manually registered components:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Display name of the component |
| `description` | `string` | Description for the AI to understand the component's purpose |
| `component` | `ComponentType` | The React component |
| `propsSchema` | `ZodSchema \| JSONSchema7` | Schema defining the component's props |

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
- Zod 3.x (optional, only for manual schema configuration)

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

### Example Project

The repo includes an example Storybook project for testing and development:

```bash
# First build the addon and install example dependencies
npm run example:install

# Run the example Storybook
npm run example:storybook
```

This opens Storybook at http://localhost:6006 with sample Button, Card, Input, and Badge components. The Tambook panel will auto-discover all components from the stories.

## License

MIT
