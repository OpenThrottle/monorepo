import type {
  CheckoutDiffSummaryFragment,
  CheckoutFilePatchFragment,
} from '~/__generated__/graphql';

export interface TranscriptionSnapshot {
  /** True once the terminal chunk arrived (stop, idle reap, or hard cap). */
  readonly done: boolean;
  /** Stream error carried by the terminal chunk (session reaped, upstream loss). */
  readonly error: string | null;
  /** sortOrder of the snapshot currently held (-1 before any chunk). */
  readonly sortOrder: number;
  /** Full transcript so far — replaced wholesale, never appended. */
  readonly transcript: string;
}

/** The checkout's diff, when the query resolved. */
export interface CheckoutDiffResourceDiff {
  readonly checkoutId: string;
  readonly diff: CheckoutDiffSummaryFragment;
  readonly kind: 'diff';
}

/** One file's patch, when the query resolved. */
export interface CheckoutDiffResourceFile {
  readonly checkoutId: string;
  readonly file: CheckoutFilePatchFragment;
  readonly kind: 'file';
  readonly path: string;
}

/** The request could not be answered (no checkout id, or the query threw). */
export interface CheckoutDiffResourceFailed {
  readonly checkoutId: string;
  readonly kind: 'failed';
  /** The requested file path; undefined for a diff request. */
  readonly path: string | undefined;
}

/**
 * What `/resources/checkout-diff` answers: the checkout's diff, one file's
 * patch, or a failure. The request is echoed back so the hook can ignore a
 * response for a checkout or file that is no longer the one it asked for.
 */
export type CheckoutDiffResourceData =
  | CheckoutDiffResourceDiff
  | CheckoutDiffResourceFailed
  | CheckoutDiffResourceFile;
