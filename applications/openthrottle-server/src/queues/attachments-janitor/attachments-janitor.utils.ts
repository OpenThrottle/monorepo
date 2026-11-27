/**
 * @description Pure decisions for the attachments janitor: how long to keep a file, which directory
 * entries it may touch, and whether an mtime is old enough. Nothing here touches disk or the clock.
 */
import {
  ATTACHMENT_EXTENSION,
  ATTACHMENT_TEMP_PREFIX,
} from '../../services/attachment-store/attachment-store.constants.ts';
import {
  DEFAULT_ATTACHMENTS_RETENTION_DAYS,
  MS_PER_DAY,
} from './attachments-janitor.constants.ts';
import type { AttachmentsJanitorEntryKind } from './attachments-janitor.types.ts';

const EXTENSIONS = Object.values<string>(ATTACHMENT_EXTENSION).join('|');
const ATTACHMENT_FILE_PATTERN = new RegExp(
  `^(?<sha256>[0-9a-f]{64})\\.(?:${EXTENSIONS})$`,
);

/**
 * @description Parses `OPENTHROTTLE_ATTACHMENTS_RETENTION_DAYS`. Anything that is not a positive
 * finite number (blank, text, zero, negative) falls back to the default of 30 days.
 */
export const parseRetentionDays = (raw: string | undefined): number => {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') return DEFAULT_ATTACHMENTS_RETENTION_DAYS;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ATTACHMENTS_RETENTION_DAYS;
  }
  return parsed;
};

export const retentionDaysToMs = (days: number): number => {
  return days * MS_PER_DAY;
};

/**
 * @description Classifies a directory entry by name. Only `<sha256>.<png|jpg|gif|webp>` and
 * `.tmp-*` are the janitor's to touch; every other name is ignored.
 */
export const classifyEntryName = (
  name: string,
): AttachmentsJanitorEntryKind => {
  const sha256 = ATTACHMENT_FILE_PATTERN.exec(name)?.groups?.['sha256'];
  if (sha256 !== undefined) return { kind: 'attachment', sha256 };
  if (name.startsWith(ATTACHMENT_TEMP_PREFIX)) return { kind: 'temp' };
  return { kind: 'ignored' };
};

/** @description True when `mtimeMs` is strictly older than `maxAgeMs` before `nowMs`. */
export const isOlderThan = (
  mtimeMs: number,
  nowMs: number,
  maxAgeMs: number,
): boolean => {
  return nowMs - mtimeMs > maxAgeMs;
};

/**
 * @description Whether this server may delete attachment FILES. The root is shared by every
 * checkout on the machine (it lives under the user's home), but a worktree with its own database
 * (`OT_WORKTREE_DB=isolated`) cannot see the primary's references, so it would reap files an old
 * primary conversation still shows. Only a checkout that is not a worktree reaps files;
 * worktrees still sweep their own unlinked rows.
 */
export const mayReapAttachmentFiles = (
  worktreeDb: string | undefined,
): boolean => {
  return (worktreeDb ?? '').trim() === '';
};

/** @description Splits a list into consecutive chunks of at most `size` items. */
export const chunkList = <TItem>(
  items: readonly TItem[],
  size: number,
): TItem[][] => {
  const chunkSize = Math.max(1, Math.floor(size));
  const chunks: TItem[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};
