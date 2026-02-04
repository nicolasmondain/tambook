/**
 * Service for fetching and parsing Storybook's story index
 */

/**
 * Entry from Storybook's index.json
 */
export interface StoryIndexEntry {
  id: string;
  title: string;       // e.g., "Components/Button"
  name: string;        // e.g., "Primary"
  importPath: string;
  type: 'story' | 'docs';
  tags?: string[];
}

/**
 * Storybook's index.json structure
 */
interface StoryIndex {
  v: number;
  entries: Record<string, StoryIndexEntry>;
}

/**
 * Fetches the story index from Storybook
 * @returns Array of story index entries
 */
export async function fetchStoryIndex(): Promise<StoryIndexEntry[]> {
  try {
    const response = await fetch('/index.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch story index: ${response.status}`);
    }
    const index: StoryIndex = await response.json();
    return Object.values(index.entries);
  } catch (error) {
    console.error('[Tambook] Failed to fetch story index:', error);
    return [];
  }
}

/**
 * Extract unique component names from story entries
 * Groups stories by their component (derived from title path)
 *
 * @param entries - Story index entries
 * @returns Map of componentName → storyIds
 */
export function extractUniqueComponents(
  entries: StoryIndexEntry[]
): Map<string, string[]> {
  const componentMap = new Map<string, string[]>();

  for (const entry of entries) {
    // Only process stories, not docs
    if (entry.type !== 'story') {
      continue;
    }

    // Extract component name from title path
    // e.g., "Components/Button" -> "Button"
    // e.g., "Design System/Forms/Input" -> "Input"
    const parts = entry.title.split('/');
    const componentName = parts[parts.length - 1];

    const existingStories = componentMap.get(componentName) || [];
    existingStories.push(entry.id);
    componentMap.set(componentName, existingStories);
  }

  return componentMap;
}

/**
 * Get all unique story IDs (type: 'story' only)
 */
export function getStoryIds(entries: StoryIndexEntry[]): string[] {
  return entries
    .filter((entry) => entry.type === 'story')
    .map((entry) => entry.id);
}

/**
 * Get one story ID per unique component (for efficient loading)
 * This returns only one story per component, which is enough to extract metadata
 */
export function getOneStoryPerComponent(
  entries: StoryIndexEntry[]
): Map<string, string> {
  const componentToStory = new Map<string, string>();

  for (const entry of entries) {
    if (entry.type !== 'story') {
      continue;
    }

    const parts = entry.title.split('/');
    const componentName = parts[parts.length - 1];

    // Only keep the first story for each component
    if (!componentToStory.has(componentName)) {
      componentToStory.set(componentName, entry.id);
    }
  }

  return componentToStory;
}
