import type { Renderer, ProjectAnnotations } from 'storybook/internal/types';
import React from 'react';
import { addons } from 'storybook/internal/preview-api';
import { withTamboContext } from './decorators/withTamboContext';
import { EVENTS, PARAM_KEY } from './constants';
import {
  globalComponentRegistry,
  extractComponentFromContext,
  type StoryContext as ExtractorContext,
} from './services/componentExtractor';
import { fetchStoryIndex, getOneStoryPerComponent } from './services/storyIndexService';
import { setConfig, getConfig } from './services/configStore';

// Flag to track if preparation has been initiated
let preparationInitiated = false;

/**
 * Prepared story from loadStory
 */
interface PreparedStory {
  id: string;
  title: string;
  name: string;
  component?: React.ComponentType<unknown>;
  argTypes?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

/**
 * Initialize component preparation at preview startup.
 * This runs once when the preview loads, ensuring components are available
 * even when viewing docs pages directly.
 */
function initializeComponentPreparation() {
  const channel = addons.getChannel();

  const handlePrepareAll = async () => {
    if (preparationInitiated) return;
    preparationInitiated = true;

    console.log('[Tambook] Starting component preparation...');

    try {
      const entries = await fetchStoryIndex();
      if (entries.length === 0) {
        console.warn('[Tambook] No stories found in index');
        channel.emit(EVENTS.ALL_COMPONENTS_READY, {
          components: globalComponentRegistry.getNames(),
        });
        return;
      }

      const componentStories = getOneStoryPerComponent(entries);
      const storyIds = Array.from(componentStories.values());
      const totalStories = storyIds.length;

      console.log(`[Tambook] Found ${totalStories} unique components to prepare`);

      channel.emit(EVENTS.PREPARATION_PROGRESS, { loaded: 0, total: totalStories });

      // Get the Storybook preview API
      const preview = (window as any).__STORYBOOK_PREVIEW__;
      const storyStore = preview?.storyStoreValue || preview?.storyStore;

      if (!storyStore) {
        console.warn('[Tambook] Storybook preview API not available');
        channel.emit(EVENTS.ALL_COMPONENTS_READY, {
          components: globalComponentRegistry.getNames(),
        });
        return;
      }

      for (let i = 0; i < storyIds.length; i++) {
        const storyId = storyIds[i];
        try {
          const story = await storyStore.loadStory({ storyId }) as PreparedStory;

          // Extract API config from story parameters (only once)
          if (!getConfig().apiKey && story?.parameters) {
            const tambookParams = story.parameters[PARAM_KEY] as {
              apiKey?: string;
              apiUrl?: string;
            } | undefined;
            if (tambookParams?.apiKey) {
              setConfig({
                apiKey: tambookParams.apiKey,
                apiUrl: tambookParams.apiUrl,
              });
              console.log('[Tambook] API config initialized from story parameters');
            }
          }

          if (story?.argTypes && story?.component) {
            const extractorContext: ExtractorContext = {
              title: story.title,
              name: story.name,
              component: story.component,
              argTypes: story.argTypes as ExtractorContext['argTypes'],
              parameters: story.parameters as ExtractorContext['parameters'],
            };

            const extracted = extractComponentFromContext(extractorContext);
            if (extracted) {
              const isNew = globalComponentRegistry.register(extracted);
              if (isNew) {
                console.log(`[Tambook] Prepared component: ${extracted.name}`);
              }
            }
          }
        } catch (e) {
          console.warn(`[Tambook] Failed to prepare story ${storyId}:`, e);
        }

        channel.emit(EVENTS.PREPARATION_PROGRESS, { loaded: i + 1, total: totalStories });
      }

      const componentNames = globalComponentRegistry.getNames();
      console.log(`[Tambook] Component preparation complete: ${componentNames.length} components`);
      channel.emit(EVENTS.ALL_COMPONENTS_READY, { components: componentNames });
    } catch (error) {
      console.error('[Tambook] Component preparation failed:', error);
      channel.emit(EVENTS.ALL_COMPONENTS_READY, {
        components: globalComponentRegistry.getNames(),
      });
    }
  };

  const handleRequestComponents = () => {
    const componentNames = globalComponentRegistry.getNames();
    if (componentNames.length > 0) {
      channel.emit(EVENTS.ALL_COMPONENTS_READY, { components: componentNames });
    }
  };

  channel.on(EVENTS.REQUEST_PREPARE_ALL, handlePrepareAll);
  channel.on(EVENTS.REQUEST_COMPONENTS, handleRequestComponents);
}

// Initialize preparation listeners at preview startup
initializeComponentPreparation();

/**
 * Preview annotations for tambook addon
 *
 * This wraps all stories with the TamboProvider context and sets up
 * communication with the manager panel.
 */
const preview: ProjectAnnotations<Renderer> = {
  decorators: [withTamboContext],
};

export default preview;

// Export components for use in MDX/stories
export { DesignSystemChat } from './components/DesignSystemChat';
