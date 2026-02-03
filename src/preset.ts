import { dirname, join } from 'path';

/**
 * Storybook preset configuration for tambook addon
 *
 * This file configures the addon's manager and preview entry points.
 */

/**
 * Resolve absolute path to a package entry
 */
function getAbsolutePath(packageName: string): string {
  return dirname(require.resolve(join(packageName, 'package.json')));
}

export function managerEntries(entry: string[] = []): string[] {
  return [...entry, join(getAbsolutePath('tambook'), 'dist', 'manager.js')];
}

export function previewAnnotations(entry: string[] = []): string[] {
  return [...entry, join(getAbsolutePath('tambook'), 'dist', 'preview.js')];
}
