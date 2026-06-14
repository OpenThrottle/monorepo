import type {
  ChatContextSource,
  ChatModelOption,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';

/**
 * @description Mock option lists for the home route's chat composer toolbar.
 * These stand in until the controls are wired to real config — models to model
 * configuration, personas to the OpenThrottle personas registry, context
 * sources to project/file context. Replace the data here, not the component.
 */

/** Curated (meaningful) order — do not alphabetize. */
export const CHAT_TOOLBAR_MODELS: readonly ChatModelOption[] = [
  { description: 'Most capable', id: 'opus-4-8', label: 'Opus 4.8' },
  { description: 'Balanced', id: 'sonnet-4-6', label: 'Sonnet 4.6' },
  { description: 'Fastest', id: 'haiku-4-5', label: 'Haiku 4.5' },
];

export const CHAT_TOOLBAR_PERSONAS: readonly ChatPersonaOption[] = [
  { description: 'Designs the plan', id: 'architect', label: 'Architect' },
  { description: 'Executes the work', id: 'builder', label: 'Builder' },
  { description: 'Reviews changes', id: 'reviewer', label: 'Reviewer' },
];

export const CHAT_TOOLBAR_CONTEXT_SOURCES: readonly ChatContextSource[] = [
  { id: 'files', label: 'Files' },
  { id: 'project', label: 'Project' },
];
