import type {
  ChatContextSource,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';

/**
 * @description Mock option lists for the admin header chat composer toolbar.
 * Personas and context sources stand in until wired to the OpenThrottle personas
 * registry and project/file context (registry personas, when present, come from
 * the loader and take precedence). Mirrors the developer app's fallback data.
 */

export const CHAT_TOOLBAR_PERSONAS: readonly ChatPersonaOption[] = [
  { description: 'Designs the plan', id: 'architect', label: 'Architect' },
  { description: 'Executes the work', id: 'builder', label: 'Builder' },
  { description: 'Reviews changes', id: 'reviewer', label: 'Reviewer' },
];

export const CHAT_TOOLBAR_CONTEXT_SOURCES: readonly ChatContextSource[] = [
  { id: 'files', label: 'Files' },
  { id: 'project', label: 'Project' },
];
