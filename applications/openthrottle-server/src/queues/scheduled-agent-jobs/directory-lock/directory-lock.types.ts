/**
 * Release handle returned by {@link ScheduledAgentJobDirectoryLockService.acquire}. `held` is false for
 * a no-op handle (no key, Redis unconfigured, or acquisition abandoned) so callers can log honestly;
 * `release` is always safe to call, exactly once or more.
 */
export interface ScheduledAgentJobDirectoryLock {
  readonly held: boolean;
  readonly release: () => Promise<void>;
}

/** Outcome of an acquisition attempt: the lock, or why the caller should stop waiting. */
export type ScheduledAgentJobDirectoryLockResult =
  | { readonly lock: ScheduledAgentJobDirectoryLock; readonly status: 'held' }
  | { readonly status: 'timeout'; readonly waitedMs: number };
