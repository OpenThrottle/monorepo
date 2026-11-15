/**
 * The already-normalized removal record the service persists. The caller owns validation and
 * truncation; the service stores what it is given.
 */
export interface RecordWorktreeRemovalInput {
  readonly agentSession: string | null;
  readonly ancestry: string | null;
  readonly branch: string | null;
  readonly checkoutId: string | null;
  readonly filesystemPath: string;
  readonly outcome: string;
  readonly parentCommand: string | null;
  readonly pid: number | null;
  readonly ppid: number | null;
  readonly probe: string | null;
  readonly removedAt: Date | null;
  readonly repositoryId: string | null;
  readonly result: string | null;
  readonly userId: string;
}
