import type { ComponentType } from 'react';
import type { ZodSchema } from 'zod';

/**
 * Configuration for a component registered with Tambook
 */
export interface TambookComponentConfig<P = unknown> {
  /** Display name of the component */
  name: string;

  /** Description of the component for the AI to understand its purpose */
  description: string;

  /** The React component */
  component: ComponentType<P>;

  /** Zod schema defining the component's props */
  propsSchema: ZodSchema<P>;
}

/**
 * Tambook addon parameters in Storybook configuration
 */
export interface TambookParameters {
  /** Array of components registered for generation */
  components?: TambookComponentConfig[];

  /** Optional custom API URL for self-hosted Tambo */
  apiUrl?: string;

  /** Optional API key (for cloud-hosted Tambo) */
  apiKey?: string;
}

/**
 * Message in the chat thread
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;

  /** Role of the message sender */
  role: 'user' | 'assistant';

  /** Text content of the message */
  content: string;

  /** Timestamp of the message */
  timestamp: number;

  /** Generated component data if applicable */
  generatedComponent?: GeneratedComponent;
}

/**
 * Data for a generated component
 */
export interface GeneratedComponent {
  /** Name of the component that was generated */
  componentName: string;

  /** Props passed to the generated component */
  props: Record<string, unknown>;

  /** Rendered React element (only in preview context) */
  element?: React.ReactElement;
}

/**
 * Thread state synchronized between Manager and Preview
 */
export interface ThreadState {
  /** All messages in the thread */
  messages: ChatMessage[];

  /** Whether the AI is currently generating a response */
  isGenerating: boolean;

  /** Current error message if any */
  error?: string;
}

/**
 * Event payload for SEND_MESSAGE event
 */
export interface SendMessagePayload {
  /** The user's message content */
  content: string;
}

/**
 * Event payload for THREAD_UPDATE event
 */
export interface ThreadUpdatePayload {
  /** Updated thread state */
  state: ThreadState;
}

/**
 * Event payload for COMPONENT_GENERATED event
 */
export interface ComponentGeneratedPayload {
  /** The generated component data */
  component: GeneratedComponent;

  /** ID of the message containing the component */
  messageId: string;
}

/**
 * Event payload for ERROR event
 */
export interface ErrorPayload {
  /** Error message */
  message: string;

  /** Optional error code */
  code?: string;
}

/**
 * Event payload for COMPONENTS_REGISTERED event
 */
export interface ComponentsRegisteredPayload {
  /** Names of registered components */
  componentNames: string[];
}
