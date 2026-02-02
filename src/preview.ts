import type { Renderer, ProjectAnnotations } from 'storybook/internal/types';
import { withTamboContext } from './decorators/withTamboContext';

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
