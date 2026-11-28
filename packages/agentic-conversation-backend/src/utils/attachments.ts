/**
 * Structured injection of the composer's image attachments for CLI agents that
 * read files with their own tools (claude). The files already live under the
 * attachments root; this turns them into an "Attached images" preamble listing
 * absolute paths, and stages them into a per-turn directory a CLI is granted so
 * its Read tool may open them from outside the cwd. Image bytes are never inlined.
 */

import { copyFile, link, mkdtemp, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { isErrorWithCode, toErrorMessage } from '@openthrottle/nodejs-utils';

import type { ConversationAttachment } from '../types/conversation-backend.ts';

/**
 * The attachment paths, deduplicated and in first-seen order. Empty when the
 * list is absent or empty.
 */
export function attachmentPaths(
  attachments: readonly ConversationAttachment[] | undefined,
): string[] {
  const paths = (attachments ?? []).map((attachment) => attachment.path);
  return [...new Set(paths)];
}

/**
 * Build the "Attached images" preamble, or `''` when there is nothing to
 * inject. It names absolute paths and tells the agent to view them with its
 * Read tool.
 */
export function attachmentsPreamble(
  attachments: readonly ConversationAttachment[] | undefined,
): string {
  const paths = attachmentPaths(attachments);
  if (paths.length === 0) {
    return '';
  }

  return [
    'The user attached these images (absolute paths). View each one with your Read tool before answering:',
    ...paths.map((path) => `- ${path}`),
  ].join('\n');
}

/**
 * Prepend the {@link attachmentsPreamble} to a composed CLI prompt, separated
 * by a blank line. Returns the prompt unchanged when there are no attachments.
 */
export function withAttachments(
  prompt: string,
  attachments: readonly ConversationAttachment[] | undefined,
): string {
  const preamble = attachmentsPreamble(attachments);
  return preamble === '' ? prompt : `${preamble}\n\n${prompt}`;
}

/**
 * Prefix of a per-turn staging directory. It sits INSIDE the attachments root
 * (so a hardlink never crosses a filesystem) and starts with `.turn-`, a name
 * the attachments janitor ignores: it only touches `<sha256>.<ext>` and
 * `.tmp-*` entries, and never recurses into directories.
 */
export const TURN_ATTACHMENTS_DIR_PREFIX = '.turn-';

/**
 * A turn's attachments staged into a private directory. Granting `dir` (and
 * only `dir`) lets the agent read this turn's images and no other upload.
 */
export interface StagedTurnAttachments {
  /** The turn's attachments with `path` rewritten to the staged copies. */
  readonly attachments: readonly ConversationAttachment[];
  /** Idempotent. Removes the staging directory; never throws. */
  readonly cleanup: () => Promise<void>;
  /** The per-turn directory to grant with `--add-dir`. */
  readonly dir: string;
}

/**
 * Outcome of {@link stageTurnAttachments}: a result, not a throw, so the caller
 * can surface a failed turn without a `try`/`catch`.
 */
export type StageTurnAttachmentsResult =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly staged: StagedTurnAttachments | undefined };

/**
 * Hardlink `source` to `target`, falling back to a copy when the link is
 * impossible (`EXDEV` across filesystems, `EPERM`/`ENOTSUP` where the
 * filesystem forbids hardlinks). A hardlink keeps the inode alive even if the
 * janitor unlinks the root entry mid-turn; the bytes are freed once the
 * per-turn directory is removed.
 */
async function linkOrCopy(source: string, target: string): Promise<void> {
  try {
    await link(source, target);
  } catch (error) {
    const code = isErrorWithCode(error) ? error.code : undefined;
    if (code !== 'EXDEV' && code !== 'EPERM' && code !== 'ENOTSUP') {
      throw error;
    }
    await copyFile(source, target);
  }
}

/**
 * Stage the turn's attachments into a fresh `<root>/.turn-XXXXXX` directory
 * (mode 0700) and return copies of the attachments pointing inside it. The
 * root is the first attachment's parent directory. With no attachments there is
 * nothing to grant and `staged` is `undefined`. On any failure the partial
 * directory is removed and the error is returned.
 */
export async function stageTurnAttachments(
  attachments: readonly ConversationAttachment[] | undefined,
): Promise<StageTurnAttachmentsResult> {
  const first = attachments?.[0];
  if (attachments === undefined || first === undefined) {
    return { ok: true, staged: undefined };
  }

  let dir: string | undefined;
  const cleanup = async (): Promise<void> => {
    if (dir !== undefined) {
      await rm(dir, { force: true, recursive: true }).catch(() => undefined);
    }
  };

  try {
    dir = await mkdtemp(join(dirname(first.path), TURN_ATTACHMENTS_DIR_PREFIX));
    const stagedDir = dir;
    const unique = [
      ...new Map(
        attachments.map((attachment) => [attachment.path, attachment]),
      ).values(),
    ];
    const staged = await Promise.all(
      unique.map(async (attachment) => {
        const target = join(stagedDir, basename(attachment.path));
        await linkOrCopy(attachment.path, target);
        return { ...attachment, path: target };
      }),
    );

    return {
      ok: true,
      staged: { attachments: staged, cleanup, dir: stagedDir },
    };
  } catch (error) {
    await cleanup();
    return {
      error: `Could not stage the attached images: ${toErrorMessage(error)}`,
      ok: false,
    };
  }
}
