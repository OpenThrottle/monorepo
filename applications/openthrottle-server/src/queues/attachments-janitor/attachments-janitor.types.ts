import type { Job } from 'bullmq';

/** @description Empty payload for the scheduled attachments cleanup. */
export interface AttachmentsJanitorJobData {
  /* No payload needed for scheduled run */
}

export type AttachmentsJanitorJob = Job<AttachmentsJanitorJobData, void>;

export interface AttachmentsJanitorSummary {
  readonly filesDeleted: number;
  readonly filesKept: number;
  readonly rowsDeleted: number;
  readonly tempFilesDeleted: number;
  readonly turnDirsDeleted: number;
}

/** What the janitor concluded about one directory entry. */
export type AttachmentsJanitorEntryKind =
  | { readonly kind: 'attachment'; readonly sha256: string }
  | { readonly kind: 'ignored' }
  | { readonly kind: 'temp' }
  | { readonly kind: 'turn' };

/** The outcome for one examined file. */
export type AttachmentsJanitorFileOutcome = 'deleted' | 'gone' | 'kept';
