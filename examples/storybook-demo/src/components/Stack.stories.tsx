import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from './Stack';
import { Button } from './Button';
import { Badge } from './Badge';

const meta: Meta<typeof Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  parameters: {
    docs: {
      description: {
        component: 'A flexible container for arranging items vertically or horizontally with consistent spacing.',
      },
    },
  },
  argTypes: {
    direction: {
      control: 'radio',
      options: ['vertical', 'horizontal'],
      description: 'Direction of the stack layout',
    },
    gap: {
      control: 'select',
      options: ['none', 'small', 'medium', 'large'],
      description: 'Space between items',
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch'],
      description: 'Cross-axis alignment',
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around'],
      description: 'Main-axis alignment',
    },
    wrap: {
      control: 'boolean',
      description: 'Whether items should wrap',
    },
    children: {
      control: false,
      description: 'Nested components',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Stack>;

export const Vertical: Story = {
  args: {
    direction: 'vertical',
    gap: 'medium',
  },
  render: (args) => (
    <Stack {...args}>
      <Button label="First Button" />
      <Button label="Second Button" variant="secondary" />
      <Button label="Third Button" variant="outline" />
    </Stack>
  ),
};

export const Horizontal: Story = {
  args: {
    direction: 'horizontal',
    gap: 'medium',
  },
  render: (args) => (
    <Stack {...args}>
      <Badge text="Badge 1" color="blue" />
      <Badge text="Badge 2" color="green" />
      <Badge text="Badge 3" color="purple" />
    </Stack>
  ),
};

export const Centered: Story = {
  args: {
    direction: 'horizontal',
    gap: 'large',
    align: 'center',
    justify: 'center',
  },
  render: (args) => (
    <Stack {...args}>
      <Button label="Cancel" variant="outline" />
      <Button label="Submit" variant="primary" />
    </Stack>
  ),
};

export const SpaceBetween: Story = {
  args: {
    direction: 'horizontal',
    justify: 'between',
    align: 'center',
  },
  render: (args) => (
    <div style={{ width: '100%', maxWidth: '400px' }}>
      <Stack {...args}>
        <Badge text="Status: Active" color="green" />
        <Button label="Edit" size="small" />
      </Stack>
    </div>
  ),
};
