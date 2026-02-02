/**
 * Storybook preset configuration for tambook addon
 *
 * This file configures the addon's manager and preview entry points.
 */

export function managerEntries(entry: string[] = []): string[] {
  return [...entry, 'tambook/manager'];
}

export function previewAnnotations(entry: string[] = []): string[] {
  return [...entry, 'tambook/preview'];
}
