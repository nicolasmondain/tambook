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

  /** Sent from Preview to Manager when a component is generated */
  COMPONENT_GENERATED: `${ADDON_ID}/component-generated`,

  /** Sent from Manager to Preview to clear the conversation */
  CLEAR_THREAD: `${ADDON_ID}/clear-thread`,

  /** Sent from Preview to Manager with error information */
  ERROR: `${ADDON_ID}/error`,

  /** Sent from Preview to Manager when components are registered */
  COMPONENTS_REGISTERED: `${ADDON_ID}/components-registered`,
} as const;

/**
 * Default configuration for the addon
 */
export const DEFAULT_CONFIG = {
  // No default apiUrl - let SDK use Tambo Cloud (https://api.tambo.co)
} as const;
