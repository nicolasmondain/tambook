import { describe, it, expect, vi } from 'vitest';
import {
  generateStoryCode,
  downloadStoryFile,
  copyStoryToClipboard,
} from './storyGenerator';
import type { GeneratedComponent } from '../types';

describe('storyGenerator', () => {
  const mockComponent: GeneratedComponent = {
    componentName: 'Button',
    props: {
      label: 'Click me',
      variant: 'primary',
      disabled: false,
    },
  };

  describe('generateStoryCode', () => {
    it('generates valid story code with default options', () => {
      const code = generateStoryCode(mockComponent);

      expect(code).toContain("import type { Meta, StoryObj } from '@storybook/react'");
      expect(code).toContain('import { Button }');
      expect(code).toContain("title: 'Generated/Button'");
      expect(code).toContain('component: Button');
      expect(code).toContain("label: 'Click me'");
      expect(code).toContain("variant: 'primary'");
      expect(code).toContain('disabled: false');
    });

    it('uses custom story name when provided', () => {
      const code = generateStoryCode(mockComponent, { storyName: 'Primary' });

      expect(code).toContain('export const Primary: Story');
    });

    it('uses custom import path when provided', () => {
      const code = generateStoryCode(mockComponent, {
        componentImportPath: '../components/Button',
      });

      expect(code).toContain("import { Button } from '../components/Button'");
    });

    it('handles empty props', () => {
      const emptyComponent: GeneratedComponent = {
        componentName: 'EmptyComponent',
        props: {},
      };

      const code = generateStoryCode(emptyComponent);

      expect(code).toContain('args: {}');
    });

    it('handles nested objects in props', () => {
      const nestedComponent: GeneratedComponent = {
        componentName: 'Complex',
        props: {
          style: {
            color: 'red',
            fontSize: 14,
          },
        },
      };

      const code = generateStoryCode(nestedComponent);

      expect(code).toContain('style:');
      expect(code).toContain("color: 'red'");
      expect(code).toContain('fontSize: 14');
    });

    it('handles arrays in props', () => {
      const arrayComponent: GeneratedComponent = {
        componentName: 'List',
        props: {
          items: ['one', 'two', 'three'],
        },
      };

      const code = generateStoryCode(arrayComponent);

      expect(code).toContain("items: ['one', 'two', 'three']");
    });

    it('escapes single quotes in strings', () => {
      const quotedComponent: GeneratedComponent = {
        componentName: 'Quote',
        props: {
          text: "It's a test",
        },
      };

      const code = generateStoryCode(quotedComponent);

      expect(code).toContain("text: 'It\\'s a test'");
    });
  });

  describe('downloadStoryFile', () => {
    it('creates and clicks a download link', () => {
      const mockClick = vi.fn();
      const mockAppendChild = vi.spyOn(document.body, 'appendChild');
      const mockRemoveChild = vi.spyOn(document.body, 'removeChild');

      // Mock createElement to return our controlled element
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const element = originalCreateElement(tag);
        if (tag === 'a') {
          element.click = mockClick;
        }
        return element;
      });

      downloadStoryFile(mockComponent);

      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();

      vi.restoreAllMocks();
    });
  });

  describe('copyStoryToClipboard', () => {
    it('copies story code to clipboard', async () => {
      await copyStoryToClipboard(mockComponent);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Button')
      );
    });
  });
});
