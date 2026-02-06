import type { Meta, StoryObj } from '@storybook/react';
import { Box } from './Box';
import { Text } from './Text';

const meta: Meta<typeof Box> = {
  title: 'Layout/Box',
  component: Box,
  parameters: {
    docs: {
      description: {
        component: 'A generic container component with configurable spacing, background, and border.',
      },
    },
  },
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'small', 'medium', 'large'],
      description: 'Inner spacing',
    },
    margin: {
      control: 'select',
      options: ['none', 'small', 'medium', 'large'],
      description: 'Outer spacing',
    },
    bg: {
      control: 'select',
      options: ['transparent', 'white', 'gray', 'primary', 'success', 'warning', 'danger'],
      description: 'Background color',
    },
    border: {
      control: 'select',
      options: ['none', 'thin', 'medium', 'thick'],
      description: 'Border style',
    },
    radius: {
      control: 'select',
      options: ['none', 'small', 'medium', 'large', 'full'],
      description: 'Border radius',
    },
    children: {
      control: false,
      description: 'Nested components',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Box>;

export const Default: Story = {
  args: {
    padding: 'medium',
    bg: 'gray',
    radius: 'medium',
  },
  render: (args) => (
    <Box {...args}>
      <Text content="Content inside a Box" />
    </Box>
  ),
};

export const WithBorder: Story = {
  args: {
    padding: 'large',
    border: 'thin',
    radius: 'medium',
    bg: 'white',
  },
  render: (args) => (
    <Box {...args}>
      <Text content="Box with border" />
    </Box>
  ),
};

export const Colored: Story = {
  args: {
    padding: 'medium',
    bg: 'primary',
    radius: 'small',
  },
  render: (args) => (
    <Box {...args}>
      <Text content="Primary colored box" />
    </Box>
  ),
};
