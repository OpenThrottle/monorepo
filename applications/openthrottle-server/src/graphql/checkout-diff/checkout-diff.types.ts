import type { CheckoutDiffFileStatusValue } from './checkout-diff.enum.ts';

/** @description One changed file as the parsers and the service pass it around. */
export interface CheckoutDiffFile {
  readonly additions: number;
  readonly binary: boolean;
  readonly deletions: number;
  readonly path: string;
  readonly previousPath: string | null;
  readonly status: CheckoutDiffFileStatusValue;
}

/** @description One `git diff --numstat -z` record. */
export interface NumstatEntry {
  readonly additions: number;
  readonly binary: boolean;
  readonly deletions: number;
  readonly path: string;
  readonly previousPath: string | null;
}

/** @description One `git diff --name-status -z` record. */
export interface NameStatusEntry {
  readonly path: string;
  readonly previousPath: string | null;
  readonly status: CheckoutDiffFileStatusValue;
}

/** @description A patch cut to a size limit. */
export interface CappedPatch {
  readonly patch: string;
  readonly truncated: boolean;
}
