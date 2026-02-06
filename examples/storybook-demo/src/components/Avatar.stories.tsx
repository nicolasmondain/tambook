import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';
import { Stack } from './Stack';

const meta: Meta<typeof Avatar> = {
  title: 'Components/Avatar',
  component: Avatar,
  parameters: {
    docs: {
      description: {
        component: 'An avatar component for displaying user images or initials.',
      },
    },
  },
  argTypes: {
    src: {
      control: 'text',
      description: 'Image URL',
    },
    name: {
      control: 'text',
      description: 'User name (used for initials fallback)',
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'xlarge'],
      description: 'Avatar size',
    },
    shape: {
      control: 'select',
      options: ['circle', 'rounded', 'square'],
      description: 'Avatar shape',
    },
    status: {
      control: 'select',
      options: [undefined, 'online', 'offline', 'busy', 'away'],
      description: 'Status indicator',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const WithImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    name: 'John Doe',
    size: 'medium',
  },
};

export const WithInitials: Story = {
  args: {
    name: 'Jane Smith',
    size: 'medium',
  },
};

export const Sizes: Story = {
  render: () => (
    <Stack direction="horizontal" gap="medium" align="center">
      <Avatar name="Small" size="small" />
      <Avatar name="Medium" size="medium" />
      <Avatar name="Large" size="large" />
      <Avatar name="XLarge" size="xlarge" />
    </Stack>
  ),
};

export const Shapes: Story = {
  render: () => (
    <Stack direction="horizontal" gap="medium" align="center">
      <Avatar name="Circle" shape="circle" />
      <Avatar name="Rounded" shape="rounded" />
      <Avatar name="Square" shape="square" />
    </Stack>
  ),
};

export const WithStatus: Story = {
  render: () => (
    <Stack direction="horizontal" gap="medium" align="center">
      <Avatar name="Online User" status="online" />
      <Avatar name="Offline User" status="offline" />
      <Avatar name="Busy User" status="busy" />
      <Avatar name="Away User" status="away" />
    </Stack>
  ),
};

export const Group: Story = {
  render: () => (
    <Stack direction="horizontal" gap="none">
      <div style={{ marginLeft: '-8px' }}>
        <Avatar name="Alice" size="medium" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" />
      </div>
      <div style={{ marginLeft: '-8px' }}>
        <Avatar name="Bob" size="medium" />
      </div>
      <div style={{ marginLeft: '-8px' }}>
        <Avatar name="Carol" size="medium" />
      </div>
      <div style={{ marginLeft: '-8px' }}>
        <Avatar name="+5" size="medium" />
      </div>
    </Stack>
  ),
};
