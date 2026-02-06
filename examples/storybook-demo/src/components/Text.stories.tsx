import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'Typography/Text',
  component: Text,
  parameters: {
    docs: {
      description: {
        component: 'A typography component for displaying text with various styles.',
      },
    },
  },
  argTypes: {
    content: {
      control: 'text',
      description: 'Text content to display',
    },
    variant: {
      control: 'select',
      options: ['body', 'caption', 'label', 'lead'],
      description: 'Typography variant',
    },
    color: {
      control: 'select',
      options: ['default', 'muted', 'primary', 'success', 'warning', 'danger'],
      description: 'Text color',
    },
    weight: {
      control: 'select',
      options: ['normal', 'medium', 'semibold', 'bold'],
      description: 'Font weight',
    },
    align: {
      control: 'radio',
      options: ['left', 'center', 'right'],
      description: 'Text alignment',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Text>;

export const Body: Story = {
  args: {
    content: 'This is body text, used for main content and paragraphs.',
    variant: 'body',
  },
};

export const Caption: Story = {
  args: {
    content: 'This is caption text, used for smaller annotations.',
    variant: 'caption',
    color: 'muted',
  },
};

export const Label: Story = {
  args: {
    content: 'Form Label',
    variant: 'label',
    weight: 'semibold',
  },
};

export const Lead: Story = {
  args: {
    content: 'This is lead text, used for introductions and highlights.',
    variant: 'lead',
  },
};

export const Colored: Story = {
  args: {
    content: 'Success message text',
    variant: 'body',
    color: 'success',
    weight: 'medium',
  },
};
