/** @description Per-call overrides of the runner's bounds; omitted fields keep the defaults. */
export interface GitRunOptions {
  readonly maxBufferBytes: number;
  readonly timeoutMs: number;
}

/**
 * @description Outcome of one git command. A failure carries the error message plus whatever stdout
 * arrived before it (a non-zero exit of `git diff --no-index` still prints a patch).
 */
export type GitRunResult =
  | { readonly ok: true; readonly stdout: string }
  | { readonly error: string; readonly ok: false; readonly stdout: string };
