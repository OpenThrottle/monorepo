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
