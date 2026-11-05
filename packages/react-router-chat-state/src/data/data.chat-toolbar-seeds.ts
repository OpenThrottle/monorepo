import type {
  ChatContextSource,
  ChatPersonaOption,
} from '@openthrottle/react-router-chat';

/**
 * @description Shared mock option lists for the chat composer toolbar (home
 * route + header chat, both apps). Personas and context sources stand in until
 * wired to the OpenThrottle personas registry and project/file context —
 * registry personas, when present, come from the loader and take precedence.
 * Models are not mocked here (the composer's model list comes from
 * `discoverLocalModels` via the loader). Single-sourced so the developer and
 * admin fallbacks cannot drift.
 * @public
 */
export const CHAT_TOOLBAR_PERSONAS: readonly ChatPersonaOption[] = [
  { description: 'Designs the plan', id: 'architect', label: 'Architect' },
  { description: 'Executes the work', id: 'builder', label: 'Builder' },
  { description: 'Reviews changes', id: 'reviewer', label: 'Reviewer' },
];

/** @public */
export const CHAT_TOOLBAR_CONTEXT_SOURCES: readonly ChatContextSource[] = [
  { id: 'files', label: 'Files' },
  { id: 'project', label: 'Project' },
];
