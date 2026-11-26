import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type {
  ChatSessionDiffAvailable,
  ChatSessionDiffFile,
  ChatSessionDiffPullRequest,
} from '../types';
import { fillTemplate } from './fillTemplate';

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
    CHAT_SESSION_DRAWER_COPY.changes.pullRequestStates;

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
