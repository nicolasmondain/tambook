import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from './Divider';
import { Stack } from './Stack';
import { Text } from './Text';

const meta: Meta<typeof Divider> = {
  title: 'Layout/Divider',
  component: Divider,
  parameters: {
    docs: {
      description: {
        component: 'A divider component for visually separating content.',
      },
    },
  },
  argTypes: {
    orientation: {
      control: 'radio',
      options: ['horizontal', 'vertical'],
      description: 'Divider orientation',
    },
    variant: {
      control: 'select',
      options: ['solid', 'dashed', 'dotted'],
      description: 'Line style',
    },
    color: {
      control: 'select',
      options: ['light', 'medium', 'dark'],
      description: 'Line color',
    },
    spacing: {
      control: 'select',
      options: ['none', 'small', 'medium', 'large'],
      description: 'Space around divider',
    },
    label: {
      control: 'text',
      description: 'Optional center label',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Default: Story = {
  args: {
    orientation: 'horizontal',
    variant: 'solid',
    color: 'medium',
    spacing: 'medium',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'OR',
    spacing: 'medium',
  },
};

export const Variants: Story = {
  render: () => (
    <Stack direction="vertical" gap="none">
      <Text content="Solid" variant="caption" />
      <Divider variant="solid" />
      <Text content="Dashed" variant="caption" />
      <Divider variant="dashed" />
      <Text content="Dotted" variant="caption" />
      <Divider variant="dotted" />
    </Stack>
  ),
};

export const Colors: Story = {
  render: () => (
    <Stack direction="vertical" gap="none">
      <Text content="Light" variant="caption" />
      <Divider color="light" />
      <Text content="Medium" variant="caption" />
      <Divider color="medium" />
      <Text content="Dark" variant="caption" />
      <Divider color="dark" />
    </Stack>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div style={{ height: '100px' }}>
      <Stack direction="horizontal" gap="medium" align="stretch">
        <Text content="Left content" />
        <Divider orientation="vertical" />
        <Text content="Right content" />
      </Stack>
    </div>
  ),
};

export const InContent: Story = {
  render: () => (
    <Stack direction="vertical" gap="none">
      <Text content="First section with some content explaining something important." />
      <Divider spacing="large" />
      <Text content="Second section with different content that follows." />
      <Divider label="More Info" spacing="large" />
      <Text content="Third section with additional details." />
    </Stack>
  ),
};
