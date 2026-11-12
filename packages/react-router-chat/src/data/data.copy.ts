/**
 * Static copy for {@link ChatUsageLimitNotice}. Kept out of the component per
 * the repo's component/data split.
 * @public
 */
export const CHAT_USAGE_LIMIT_COPY = {
  limitReached: 'Usage limit reached',
  resetsPrefix: 'resets',
} as const;

/** Tooltip copy for {@link ChatComposerPersistControl}'s Saved ↔ Private switch. */
export const CHAT_PERSIST_HINT_COPY = {
  private: 'Private — this conversation is not saved',
  saved: 'Saving — this conversation is stored in your history',
} as const;

/** Copy for {@link ChatToolCall}. */
export const CHAT_TOOL_CALL_COPY = {
  payloadTruncated: 'Output truncated when saved',
} as const;

/** Copy for {@link ChatCheckoutSelectorRow}. */
export const CHAT_CHECKOUT_ROW_COPY = {
  contextOnly: 'Context only',
  primary: 'Primary',
  worktree: 'Worktree',
} as const;

/** Copy for {@link ChatPermissionRequest}. */
export const CHAT_PERMISSION_REQUEST_COPY = {
  cancelled: 'Cancelled',
  dismiss: 'Dismiss',
  heading: 'Permission requested',
  selectedPrefix: 'Answered:',
} as const;

/** Copy for {@link ChatPermissionModeControl}'s remember-my-choice opt-in. */
export const CHAT_PERMISSION_REMEMBER_COPY = {
  hint: `When off, Auto-accept edits and Full access reset to Supervised in each new session`,
  label: 'Remember my choice',
} as const;
