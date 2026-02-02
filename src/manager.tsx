import React from 'react';
import { addons, types } from 'storybook/internal/manager-api';
import { ADDON_ID, PANEL_ID } from './constants';
import { TamboPanel } from './components/TamboPanel';

/**
 * Register the Tambook addon with Storybook's manager
 */
addons.register(ADDON_ID, () => {
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Tambook',
    match: ({ viewMode }) => viewMode === 'story',
    render: ({ active }) => <TamboPanel active={active ?? false} />,
  });
});
