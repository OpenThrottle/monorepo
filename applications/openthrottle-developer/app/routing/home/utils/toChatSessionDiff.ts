import type {
  ChatSessionDiff,
  ChatSessionDiffFile,
  ChatSessionDiffPullRequest,
} from '@openthrottle/react-router-chat';

import type {
  CheckoutDiffFileFragment,
  CheckoutDiffPullRequestFragment,
  CheckoutDiffSummaryFragment,
} from '~/__generated__/graphql';
import { CheckoutDiffFileStatus } from '~/__generated__/graphql';

const STATUS_BY_GRAPHQL = {
  [CheckoutDiffFileStatus.Added]: 'added',
  [CheckoutDiffFileStatus.Deleted]: 'deleted',
  [CheckoutDiffFileStatus.Modified]: 'modified',
  [CheckoutDiffFileStatus.Renamed]: 'renamed',
} as const satisfies Record<
  CheckoutDiffFileStatus,
  ChatSessionDiffFile['status']
>;

const toChatSessionDiffFile = (
  file: CheckoutDiffFileFragment,
): ChatSessionDiffFile => {
  return {
    additions: file.additions,
    binary: file.binary,
    deletions: file.deletions,
    path: file.path,
    previousPath: file.previousPath ?? undefined,
    status: STATUS_BY_GRAPHQL[file.status],
  };
};

const toChatSessionPullRequest = (
  pullRequest: CheckoutDiffPullRequestFragment | null | undefined,
): ChatSessionDiffPullRequest | undefined => {
  if (pullRequest === null || pullRequest === undefined) {
    return undefined;
  }

  return {
    number: pullRequest.number,
    state: pullRequest.state,
    url: pullRequest.url,
  };
};

/**
 * @description Maps the `checkoutDiff` fragment onto the plain interface the chat package's
 * Changes section takes: nulls become `undefined`, the GraphQL status enum becomes the
 * package's lowercase union.
 */
export const toChatSessionDiff = (
  diff: CheckoutDiffSummaryFragment,
): ChatSessionDiff => {
  if (!diff.available) {
    return { available: false, reason: diff.reason ?? undefined };
  }

  return {
    additions: diff.additions,
    available: true,
    baseRef: diff.baseRef ?? undefined,
    deletions: diff.deletions,
    files: diff.files.map(toChatSessionDiffFile),
    filesTruncated: diff.filesTruncated,
    headBranch: diff.headBranch ?? undefined,
    pullRequest: toChatSessionPullRequest(diff.pullRequest),
  };
};
