/**
 * @description Options for {@link pruneKeyedRunOutputDirectory}.
 */
export interface PruneKeyedRunOutputDirectoryParams {
  readonly baseDirectory: string;
  /** @description Delete files whose mtime is older than `nowMs - maxAgeMs`. */
  readonly maxAgeMs?: number;
  /** @description After age pruning, delete oldest files by mtime until total bytes is at or below this cap. */
  readonly maxTotalBytes?: number;
  /** @description Clock for tests; defaults to `Date.now()`. */
  readonly nowMs?: number;
}

/**
 * @description Result of a best-effort retention pass (per-file errors do not throw).
 */
export interface PruneKeyedRunOutputDirectoryResult {
  readonly deletedFileCount: number;
  readonly freedBytes: number;
  readonly remainingTotalBytes: number;
  readonly skippedUnlinkErrors: number;
}
