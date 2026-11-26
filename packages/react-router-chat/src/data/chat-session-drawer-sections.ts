/**
 * Ids of the session drawer's collapsible sections, in display order. The ids
 * are what a consumer persists as collapsed. As-const object (no enum, repo rule).
 *
 * @public
 */
export const CHAT_SESSION_DRAWER_SECTIONS = {
  CHANGES: 'changes',
  CONTEXT: 'context',
  ENVIRONMENT: 'environment',
  FILES: 'files',
  RUNNING: 'running',
} as const;

export type ChatSessionDrawerSectionsKey =
  keyof typeof CHAT_SESSION_DRAWER_SECTIONS;
/** Union of {@link CHAT_SESSION_DRAWER_SECTIONS} values. @public */
export type ChatSessionDrawerSectionsValue =
  (typeof CHAT_SESSION_DRAWER_SECTIONS)[ChatSessionDrawerSectionsKey];
