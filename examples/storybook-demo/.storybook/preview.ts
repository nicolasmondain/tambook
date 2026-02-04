import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    tambook: {
      // Get your API key at https://tambo.co
      apiKey: import.meta.env.STORYBOOK_TAMBO_API_KEY,
      // Optional: Use custom URL for self-hosted backend
      // apiUrl: 'http://localhost:3211',
    },
  },
};

export default preview;
