/**
 * Structured injection of the composer's image attachments for CLI agents that
 * read files with their own tools (claude). The files already live under the
 * attachments root; this turns them into an "Attached images" preamble listing
 * absolute paths, plus the distinct directories a CLI must be granted so its
 * Read tool may open them from outside the cwd. Image bytes are never inlined.
 */

import { dirname } from 'node:path';

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
 * The distinct parent directories of the attachments, in first-seen order, so
 * a CLI can grant read access outside its cwd with one flag per directory.
 */
export function attachmentDirectories(
  attachments: readonly ConversationAttachment[] | undefined,
): string[] {
  return [...new Set(attachmentPaths(attachments).map(dirname))];
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
