import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Stack } from './Stack';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    docs: {
      description: {
        component: 'A versatile card component for displaying content in a contained format. Supports nested components via children.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Card header title',
    },
    description: {
      control: 'text',
      description: 'Card body text',
    },
    imageUrl: {
      control: 'text',
      description: 'URL for header image',
    },
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated'],
      description: 'Visual style variant',
    },
    footer: {
      control: 'text',
      description: 'Footer text',
    },
    children: {
      control: false,
      description: 'Nested components (buttons, badges, etc.)',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    title: 'Card Title',
    description: 'This is the card description with some helpful text.',
    variant: 'default',
  },
};

export const WithImage: Story = {
  args: {
    title: 'Mountain View',
    description: 'A beautiful mountain landscape.',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
    variant: 'elevated',
  },
};

export const WithChildren: Story = {
  args: {
    title: 'Interactive Card',
    description: 'This card contains nested components.',
    variant: 'default',
  },
  render: (args) => (
    <Card {...args}>
      <Stack direction="horizontal" gap="small">
        <Button label="Accept" variant="primary" size="small" />
        <Button label="Decline" variant="outline" size="small" />
      </Stack>
    </Card>
  ),
};

export const WithBadgeAndButton: Story = {
  args: {
    title: 'Product Card',
    variant: 'elevated',
  },
  render: (args) => (
    <Card {...args}>
      <Stack direction="vertical" gap="medium">
        <Stack direction="horizontal" gap="small">
          <Badge text="New" color="green" />
          <Badge text="Sale" color="red" />
        </Stack>
        <Button label="Add to Cart" variant="primary" />
      </Stack>
    </Card>
  ),
};

export const Outlined: Story = {
  args: {
    title: 'Outlined Card',
    description: 'A card with an outlined style.',
    variant: 'outlined',
  },
};

export const WithFooter: Story = {
  args: {
    title: 'Card with Footer',
    description: 'This card has a footer section.',
    footer: 'Last updated: 2 hours ago',
    variant: 'default',
  },
};
