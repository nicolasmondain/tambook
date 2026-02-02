import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    docs: {
      description: {
        component: 'A flexible card component for displaying content with optional image and footer.',
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'The card title',
    },
    description: {
      control: 'text',
      description: 'Card body text or description',
    },
    imageUrl: {
      control: 'text',
      description: 'URL for the card header image',
    },
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated'],
      description: 'Visual style variant',
    },
    footer: {
      control: 'text',
      description: 'Footer text content',
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    title: 'Card Title',
    description: 'This is a description of the card content. It can span multiple lines and provides context.',
  },
};

export const WithImage: Story = {
  args: {
    title: 'Mountain View',
    description: 'A beautiful mountain landscape captured at sunrise.',
    imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
  },
};

export const Outlined: Story = {
  args: {
    title: 'Outlined Card',
    description: 'This card has an outlined style with a colored border.',
    variant: 'outlined',
  },
};

export const Elevated: Story = {
  args: {
    title: 'Elevated Card',
    description: 'This card has an elevated appearance with a shadow.',
    variant: 'elevated',
  },
};

export const WithFooter: Story = {
  args: {
    title: 'Article Title',
    description: 'An interesting article about something noteworthy.',
    footer: 'Published on January 15, 2024',
  },
};

export const Complete: Story = {
  args: {
    title: 'Featured Post',
    description: 'This is a complete card example with all props filled in.',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=200&fit=crop',
    variant: 'elevated',
    footer: 'By John Doe - 5 min read',
  },
};
