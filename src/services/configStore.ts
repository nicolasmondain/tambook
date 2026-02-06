/**
 * Global configuration store for Tambook
 *
 * This stores configuration (API key, URL) set by the decorator
 * so that standalone components like DesignSystemChat can access it.
 */

interface TambookConfig {
  apiKey?: string;
  apiUrl?: string;
}

let config: TambookConfig = {};

/**
 * Set the Tambook configuration (called from decorator)
 */
export function setConfig(newConfig: TambookConfig): void {
  config = { ...config, ...newConfig };
}

/**
 * Get the current Tambook configuration
 */
export function getConfig(): TambookConfig {
  return config;
}
