import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    docs: {
      description: {
        component: 'A small badge component for displaying status, labels, or counts.',
      },
    },
  },
  argTypes: {
    text: {
      control: 'text',
      description: 'The badge text content',
    },
    color: {
      control: 'select',
      options: ['gray', 'red', 'yellow', 'green', 'blue', 'purple'],
      description: 'Color variant of the badge',
    },
    size: {
      control: 'radio',
      options: ['small', 'medium'],
      description: 'Size of the badge',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    text: 'Badge',
  },
};

export const Success: Story = {
  args: {
    text: 'Success',
    color: 'green',
  },
};

export const Warning: Story = {
  args: {
    text: 'Warning',
    color: 'yellow',
  },
};

export const Error: Story = {
  args: {
    text: 'Error',
    color: 'red',
  },
};

export const Info: Story = {
  args: {
    text: 'Info',
    color: 'blue',
  },
};

export const Small: Story = {
  args: {
    text: 'New',
    color: 'purple',
    size: 'small',
  },
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Badge text="Gray" color="gray" />
      <Badge text="Red" color="red" />
      <Badge text="Yellow" color="yellow" />
      <Badge text="Green" color="green" />
      <Badge text="Blue" color="blue" />
      <Badge text="Purple" color="purple" />
    </div>
  ),
};
