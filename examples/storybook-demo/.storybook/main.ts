import type { StorybookConfig } from '@storybook/react-vite';
import { dirname, join } from 'path';

/**
 * Resolve package path for local file references
 */
function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    getAbsolutePath('tambook'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite') as '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Ensure symlinked packages are resolved properly
    config.resolve = config.resolve || {};
    config.resolve.preserveSymlinks = false;
    return config;
  },
};

export default config;
