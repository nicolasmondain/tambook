import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';
import { Input } from './Input';
import { Stack } from './Stack';
import { Button } from './Button';

const meta: Meta<typeof FormField> = {
  title: 'Forms/FormField',
  component: FormField,
  parameters: {
    docs: {
      description: {
        component: 'A form field wrapper that provides label, helper text, and error display for input components.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Field label',
    },
    helperText: {
      control: 'text',
      description: 'Helper text below input',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    required: {
      control: 'boolean',
      description: 'Show required indicator',
    },
    children: {
      control: false,
      description: 'Input component',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    label: 'Email',
    helperText: 'We will never share your email.',
  },
  render: (args) => (
    <FormField {...args}>
      <Input placeholder="Enter your email" />
    </FormField>
  ),
};

export const Required: Story = {
  args: {
    label: 'Username',
    required: true,
  },
  render: (args) => (
    <FormField {...args}>
      <Input placeholder="Choose a username" />
    </FormField>
  ),
};

export const WithError: Story = {
  args: {
    label: 'Password',
    error: 'Password must be at least 8 characters',
    required: true,
  },
  render: (args) => (
    <FormField {...args}>
      <Input type="password" placeholder="Enter password" />
    </FormField>
  ),
};

export const FormExample: Story = {
  render: () => (
    <Stack direction="vertical" gap="medium">
      <FormField label="Full Name" required>
        <Input placeholder="John Doe" />
      </FormField>
      <FormField label="Email" required helperText="We'll use this to contact you">
        <Input placeholder="john@example.com" />
      </FormField>
      <FormField label="Phone" helperText="Optional">
        <Input placeholder="+1 (555) 000-0000" />
      </FormField>
      <Stack direction="horizontal" gap="small" justify="end">
        <Button label="Cancel" variant="outline" />
        <Button label="Submit" variant="primary" />
      </Stack>
    </Stack>
  ),
};
