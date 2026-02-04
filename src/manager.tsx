import React from 'react';
import { addons, types } from 'storybook/internal/manager-api';
import { ADDON_ID, PANEL_ID, EVENTS } from './constants';
import { TamboPanel } from './components/TamboPanel';

// Store component list at manager level to respond to requests from docs pages
let registeredComponents: string[] = [];

/**
 * Register the Tambook addon with Storybook's manager
 */
addons.register(ADDON_ID, (api) => {
  const channel = api.getChannel();

  // Listen for component preparation completion and store the list
  channel?.on(EVENTS.ALL_COMPONENTS_READY, (payload: { components: string[] }) => {
    registeredComponents = payload.components;
  });

  // Respond to component requests (from DesignSystemChat in docs pages)
  channel?.on(EVENTS.REQUEST_COMPONENTS, () => {
    if (registeredComponents.length > 0) {
      channel?.emit(EVENTS.ALL_COMPONENTS_READY, {
        components: registeredComponents,
      });
    }
  });

  // Request component preparation when manager loads
  // Small delay to ensure preview is ready
  setTimeout(() => {
    channel?.emit(EVENTS.REQUEST_PREPARE_ALL);
  }, 500);

  // Panel for individual story pages (single-component mode)
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Tambook',
    match: ({ viewMode }) => viewMode === 'story',
    render: ({ active }) => <TamboPanel active={active ?? false} />,
  });
});
