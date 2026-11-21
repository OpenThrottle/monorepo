/**
 * Static copy for {@link ChatUsageLimitNotice}. Kept out of the component per
 * the repo's component/data split.
 * @public
 */
export const CHAT_USAGE_LIMIT_COPY = {
  limitReached: 'Usage limit reached',
  resetsPrefix: 'resets',
} as const;

/** Copy for {@link ChatDeniedActionsNotice}. */
export const CHAT_DENIED_ACTIONS_COPY = {
  hint: `The agent may have stopped early. Choose a broader permission mode to let it use these.`,
  prefix: 'Permission denied:',
} as const;

/** Tooltip copy for {@link ChatComposerPersistControl}'s Saved ↔ Private switch. */
export const CHAT_PERSIST_HINT_COPY = {
  private: 'Private — this conversation is not saved',
  saved: 'Saving — this conversation is stored in your history',
} as const;

/** Copy for {@link ChatToolCall}. */
export const CHAT_TOOL_CALL_COPY = {
  noOutputReported: 'No output reported.',
  notRun: `Not run: the agent cancelled this call after a permission was refused.`,
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

/** Copy for {@link ChatComposer}'s queue-while-streaming affordance. */
export const CHAT_COMPOSER_QUEUE_COPY = {
  placeholder: 'Queue a follow-up — it sends when this reply finishes',
  submitLabel: 'Queue',
} as const;

/** Copy for {@link ChatQueuedMessages} and {@link ChatQueuedMessageRow}. */
export const CHAT_QUEUED_MESSAGES_COPY = {
  cancelEdit: 'Cancel',
  clear: 'Clear',
  edit: 'Edit queued message',
  editLabel: 'Queued message',
  heading: 'Queued',
  lostOnReload: 'Queued messages are not saved if you reload the page.',
  paused: 'Paused — nothing sends until you resume.',
  remove: 'Remove queued message',
  resume: 'Resume',
  save: 'Save',
  sendNow: 'Send now',
} as const;
