import type { Meta, StoryObj } from '@storybook/react';
import { List, ListItem } from './List';
import { Badge } from './Badge';
import { Button } from './Button';
import { Stack } from './Stack';

const meta: Meta<typeof List> = {
  title: 'Components/List',
  component: List,
  parameters: {
    docs: {
      description: {
        component: 'A list component for displaying items. ListItem supports nested components.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'bordered', 'separated'],
      description: 'Visual style variant',
    },
    spacing: {
      control: 'select',
      options: ['compact', 'normal', 'relaxed'],
      description: 'Space between items',
    },
    children: {
      control: false,
      description: 'ListItem components',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof List>;

export const Default: Story = {
  args: {
    variant: 'default',
    spacing: 'normal',
  },
  render: (args) => (
    <List {...args}>
      <ListItem icon="•" primary="First item" />
      <ListItem icon="•" primary="Second item" />
      <ListItem icon="•" primary="Third item" />
    </List>
  ),
};

export const Bordered: Story = {
  args: {
    variant: 'bordered',
    spacing: 'normal',
  },
  render: (args) => (
    <List {...args}>
      <ListItem primary="Email notifications" secondary="Receive email updates" />
      <ListItem primary="Push notifications" secondary="Get push alerts on mobile" />
      <ListItem primary="SMS alerts" secondary="Receive text messages" />
    </List>
  ),
};

export const Separated: Story = {
  args: {
    variant: 'separated',
    spacing: 'normal',
  },
  render: (args) => (
    <List {...args}>
      <ListItem icon="📁" primary="Documents" secondary="24 files" />
      <ListItem icon="🖼️" primary="Images" secondary="128 files" />
      <ListItem icon="🎵" primary="Music" secondary="56 files" />
    </List>
  ),
};

export const WithActions: Story = {
  args: {
    variant: 'bordered',
    spacing: 'relaxed',
  },
  render: (args) => (
    <List {...args}>
      <ListItem primary="John Doe" secondary="john@example.com">
        <Stack direction="horizontal" gap="small">
          <Badge text="Admin" color="blue" />
          <Button label="Edit" variant="outline" size="small" />
        </Stack>
      </ListItem>
      <ListItem primary="Jane Smith" secondary="jane@example.com">
        <Stack direction="horizontal" gap="small">
          <Badge text="User" color="gray" />
          <Button label="Edit" variant="outline" size="small" />
        </Stack>
      </ListItem>
    </List>
  ),
};

export const Compact: Story = {
  args: {
    variant: 'default',
    spacing: 'compact',
  },
  render: (args) => (
    <List {...args}>
      <ListItem icon="✓" primary="Task completed" />
      <ListItem icon="✓" primary="Another task done" />
      <ListItem icon="○" primary="Pending task" />
    </List>
  ),
};
