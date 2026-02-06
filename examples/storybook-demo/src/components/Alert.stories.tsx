import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Text } from './Text';
import { Stack } from './Stack';

const meta: Meta<typeof Alert> = {
  title: 'Feedback/Alert',
  component: Alert,
  parameters: {
    docs: {
      description: {
        component: 'An alert component for displaying important messages. Supports nested content.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Alert title',
    },
    type: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
      description: 'Alert severity type',
    },
    dismissible: {
      control: 'boolean',
      description: 'Whether alert can be dismissed',
    },
    children: {
      control: false,
      description: 'Alert content (text, buttons, etc.)',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: {
    title: 'Information',
    type: 'info',
  },
  render: (args) => (
    <Alert {...args}>
      <Text content="This is an informational message for the user." />
    </Alert>
  ),
};

export const Success: Story = {
  args: {
    title: 'Success!',
    type: 'success',
  },
  render: (args) => (
    <Alert {...args}>
      <Text content="Your changes have been saved successfully." />
    </Alert>
  ),
};

export const Warning: Story = {
  args: {
    title: 'Warning',
    type: 'warning',
  },
  render: (args) => (
    <Alert {...args}>
      <Text content="Please review your input before continuing." />
    </Alert>
  ),
};

export const Error: Story = {
  args: {
    title: 'Error',
    type: 'error',
  },
  render: (args) => (
    <Alert {...args}>
      <Text content="An error occurred while processing your request." />
    </Alert>
  ),
};

export const Dismissible: Story = {
  args: {
    title: 'Dismissible Alert',
    type: 'info',
    dismissible: true,
  },
  render: (args) => (
    <Alert {...args}>
      <Text content="Click the X to dismiss this alert." />
    </Alert>
  ),
};

export const WithAction: Story = {
  args: {
    title: 'Action Required',
    type: 'warning',
  },
  render: (args) => (
    <Alert {...args}>
      <Stack direction="vertical" gap="small">
        <Text content="Your session is about to expire." />
        <Stack direction="horizontal" gap="small">
          <Button label="Extend Session" variant="primary" size="small" />
          <Button label="Log Out" variant="outline" size="small" />
        </Stack>
      </Stack>
    </Alert>
  ),
};
