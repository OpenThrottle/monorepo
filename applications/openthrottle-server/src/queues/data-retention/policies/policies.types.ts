export interface AgeRetentionPolicyOptions {
  /** Timestamp column the age window is measured against. */
  readonly column: string;
  /** Rows older than this many days are deleted. */
  readonly days: number;
  /** Stable policy identifier. */
  readonly name: string;
  /** Why this window is the right one, for logs and docs. */
  readonly rationale: string;
  /** Table to prune. */
  readonly table: string;
}
