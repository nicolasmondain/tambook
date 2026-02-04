/**
 * Addon identifier used for registration and channel events
 */
export const ADDON_ID = 'tambook';

/**
 * Panel identifier for the Tambo chat panel
 */
export const PANEL_ID = `${ADDON_ID}/panel`;

/**
 * Parameter key for tambook configuration in Storybook parameters
 */
export const PARAM_KEY = 'tambook';

/**
 * Channel event names for Manager-Preview communication
 */
export const EVENTS = {
  /** Sent from Manager to Preview to submit a user message */
  SEND_MESSAGE: `${ADDON_ID}/send-message`,

  /** Sent from Preview to Manager with thread state updates */
  THREAD_UPDATE: `${ADDON_ID}/thread-update`,

  /** Sent from Preview to Manager when props are generated (to update Controls) */
  PROPS_GENERATED: `${ADDON_ID}/props-generated`,

  /** Sent from Manager to Preview to clear the conversation */
  CLEAR_THREAD: `${ADDON_ID}/clear-thread`,

  /** Sent from Preview to Manager with error information */
  ERROR: `${ADDON_ID}/error`,

  /** Sent from Preview to Manager when components are registered */
  COMPONENTS_REGISTERED: `${ADDON_ID}/components-registered`,

  // Component preparation protocol events

  /** Manager → Preview: request preparation of all stories */
  REQUEST_PREPARE_ALL: `${ADDON_ID}/request-prepare-all`,

  /** Preview → Manager: story prepared with component data */
  STORY_PREPARED: `${ADDON_ID}/story-prepared`,

  /** Preview → Manager: all stories prepared */
  ALL_COMPONENTS_READY: `${ADDON_ID}/all-components-ready`,

  /** Preview → Manager: preparation progress */
  PREPARATION_PROGRESS: `${ADDON_ID}/preparation-progress`,

  // Design System mode events

  /** Manager → Preview: switch to design system mode (all components) */
  SET_DESIGN_SYSTEM_MODE: `${ADDON_ID}/set-design-system-mode`,

  /** Manager → Preview: send message in design system mode */
  SEND_DS_MESSAGE: `${ADDON_ID}/send-ds-message`,

  /** Preview → Manager: design system thread update */
  DS_THREAD_UPDATE: `${ADDON_ID}/ds-thread-update`,

  /** Manager → Preview: clear design system thread */
  CLEAR_DS_THREAD: `${ADDON_ID}/clear-ds-thread`,

  /** Preview → Manager: open design system page */
  OPEN_DESIGN_SYSTEM: `${ADDON_ID}/open-design-system`,

  /** Manager → Preview: request current component list (for late-mounting components) */
  REQUEST_COMPONENTS: `${ADDON_ID}/request-components`,

  /** Preview → Manager: current story's component info (for scoped panel) */
  CURRENT_COMPONENT: `${ADDON_ID}/current-component`,
} as const;

/**
 * Default configuration for the addon
 */
export const DEFAULT_CONFIG = {
  // No default apiUrl - let SDK use Tambo Cloud (https://api.tambo.co)
} as const;
