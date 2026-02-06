import type { Meta, StoryObj } from '@storybook/react';
import { Accordion } from './Accordion';
import { Text } from './Text';
import { Button } from './Button';
import { Stack } from './Stack';

const meta: Meta<typeof Accordion> = {
  title: 'Components/Accordion',
  component: Accordion,
  parameters: {
    docs: {
      description: {
        component: 'A collapsible accordion component for organizing content. Supports nested components.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Accordion header text',
    },
    defaultExpanded: {
      control: 'boolean',
      description: 'Whether expanded by default',
    },
    variant: {
      control: 'select',
      options: ['default', 'bordered', 'separated'],
      description: 'Visual style variant',
    },
    children: {
      control: false,
      description: 'Nested content',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  args: {
    title: 'Click to expand',
    defaultExpanded: false,
  },
  render: (args) => (
    <Accordion {...args}>
      <Text content="This is the accordion content that appears when expanded." />
    </Accordion>
  ),
};

export const Expanded: Story = {
  args: {
    title: 'Already Expanded',
    defaultExpanded: true,
  },
  render: (args) => (
    <Accordion {...args}>
      <Text content="This accordion starts in an expanded state." />
    </Accordion>
  ),
};

export const Bordered: Story = {
  args: {
    title: 'Bordered Accordion',
    variant: 'bordered',
    defaultExpanded: true,
  },
  render: (args) => (
    <Accordion {...args}>
      <Text content="This accordion has a bordered style." />
    </Accordion>
  ),
};

export const WithNestedContent: Story = {
  args: {
    title: 'FAQ: How do I get started?',
    variant: 'bordered',
    defaultExpanded: true,
  },
  render: (args) => (
    <Accordion {...args}>
      <Stack direction="vertical" gap="medium">
        <Text content="Getting started is easy! Follow these simple steps:" />
        <Text content="1. Create an account" />
        <Text content="2. Complete your profile" />
        <Text content="3. Start exploring" />
        <Button label="Get Started" variant="primary" size="small" />
      </Stack>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Stack direction="vertical" gap="none">
      <Accordion title="Section 1" variant="default">
        <Text content="Content for section 1" />
      </Accordion>
      <Accordion title="Section 2" variant="default">
        <Text content="Content for section 2" />
      </Accordion>
      <Accordion title="Section 3" variant="default">
        <Text content="Content for section 3" />
      </Accordion>
    </Stack>
  ),
};
