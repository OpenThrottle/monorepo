import { fillTemplate } from '@openthrottle/nodejs-utils';

import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type {
  ChatSessionDiffAvailable,
  ChatSessionDiffFile,
  ChatSessionDiffPullRequest,
} from '../types';

/** "1 file" / "N files". */
export const formatFileCount = (count: number): string => {
  return fillTemplate(
    count === 1
      ? CHAT_SESSION_DRAWER_COPY.files.count.one
      : CHAT_SESSION_DRAWER_COPY.files.count.many,
    { count: `${count}` },
  );
};

/** The base ref's label, or a plain fallback when the host reported none. */
export const formatBaseRef = (diff: ChatSessionDiffAvailable): string => {
  return diff.baseRef ?? CHAT_SESSION_DRAWER_COPY.changes.baseFallback;
};

/** The pull request's state as a label; an unknown state is shown as the forge sent it. */
export const formatPullRequestState = (
  pullRequest: ChatSessionDiffPullRequest,
): string => {
  const labels: Readonly<Record<string, string>> =
    CHAT_SESSION_DRAWER_COPY.pullRequest.states;

  return labels[pullRequest.state] ?? pullRequest.state;
};

/**
 * @description The Changes section's headline: `+A −D across N files vs <base>`. The base falls
 * back to a plain "the base branch" when the host reported none.
 */
export const formatDiffSummary = (diff: ChatSessionDiffAvailable): string => {
  return fillTemplate(CHAT_SESSION_DRAWER_COPY.changes.summary, {
    additions: `${diff.additions}`,
    base: formatBaseRef(diff),
    deletions: `${diff.deletions}`,
    files: formatFileCount(diff.files.length),
  });
};

/** Tooltip for a file row: its path, or where a renamed file came from. */
export const describeDiffFileTitle = (file: ChatSessionDiffFile): string => {
  if (file.previousPath === undefined) {
    return file.path;
  }

  return fillTemplate(CHAT_SESSION_DRAWER_COPY.changes.renamedFrom, {
    path: file.previousPath,
  });
};

/**
 * @description The patch dialog's subtitle: status, then `+A −D` (skipped for a binary file),
 * then where a renamed file came from, joined with ` · `.
 */
export const describeDiffFile = (file: ChatSessionDiffFile): string => {
  const copy = CHAT_SESSION_DRAWER_COPY.changes;
  const parts: string[] = [copy.statuses[file.status]];
  if (!file.binary) {
    parts.push(
      fillTemplate(copy.patchDialogCounts, {
        additions: `${file.additions}`,
        deletions: `${file.deletions}`,
      }),
    );
  }
  if (file.previousPath !== undefined) {
    parts.push(describeDiffFileTitle(file));
  }

  return parts.join(' · ');
};

/**
 * @description The path `step` places away from `path` in `files`, wrapping past either end so
 * arrowing through the patch dialog cycles. Undefined when `path` is not in the list.
 */
export const findAdjacentFilePath = (
  files: readonly ChatSessionDiffFile[],
  path: string,
  step: number,
): string | undefined => {
  const index = files.findIndex((file) => file.path === path);
  if (index === -1) {
    return undefined;
  }
  const next = (((index + step) % files.length) + files.length) % files.length;

  return files[next]?.path;
};
