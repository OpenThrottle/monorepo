import { Badge } from '@openthrottle/react-router-shadcn';
import {
  ExternalLink,
  FolderOpen,
  GitBranch,
  GitPullRequest,
} from 'lucide-react';
import * as React from 'react';

import { useDefaultEditor } from '~/global/hooks/useDefaultEditor';
import { getCheckoutEditorLink } from '~/routing/plans/utils/getCheckoutEditorLink';

export interface PlanRunProvenanceCheckout {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly kind: string;
}

export interface PlanRunProvenancePullRequest {
  readonly number: number;
  readonly repo: string;
  readonly state?: string | null;
  readonly url: string;
}

export interface PlanRunProvenanceCellProps {
  /** Git branch the run operates on (run provenance); null for legacy rows. */
  readonly branch?: string | null;
  /** The run's on-disk checkout/worktree; null when none was resolved. */
  readonly checkout?: PlanRunProvenanceCheckout | null;
  /** The run's linked pull request; null when none has been recorded. */
  readonly pullRequest?: PlanRunProvenancePullRequest | null;
}

/**
 * @description Run-provenance cell for the queued-run audit table: the run's
 * branch, an "Open in editor" deep-link built from the worktree/checkout
 * filesystem path (shown only when a path is present), and the linked PR with
 * its lifecycle state and GitHub link. The editor link opens in the user's
 * default editor (VS Code when unset) via the shared workspace deep links.
 */
export const PlanRunProvenanceCell = (
  props: PlanRunProvenanceCellProps,
): React.ReactElement => {
  const { branch, checkout, pullRequest } = props;

  // Hooks
  const defaultEditor = useDefaultEditor();

  // Setup
  // Only build a deep-link when a filesystem path is actually present.
  const editorLink = getCheckoutEditorLink(checkout, defaultEditor);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (branch == null && checkout == null && pullRequest == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {branch != null && (
        <span className="flex items-center gap-1">
          <GitBranch aria-hidden={true} className="size-3 shrink-0" />
          <span className="truncate font-mono" title={branch}>
            {branch}
          </span>
        </span>
      )}

      {editorLink != null && checkout != null && (
        <a
          className="text-primary flex items-center gap-1 underline-offset-2 hover:underline"
          href={editorLink}
          title={checkout.filesystemPath}
        >
          <FolderOpen aria-hidden={true} className="size-3 shrink-0" />
          <span>
            Open in editor
            {checkout.kind === 'worktree' ? ' (worktree)' : ''}
          </span>
        </a>
      )}

      {pullRequest != null && (
        <a
          className="text-primary flex items-center gap-1 underline-offset-2 hover:underline"
          href={pullRequest.url}
          rel="noreferrer"
          target="_blank"
        >
          <GitPullRequest aria-hidden={true} className="size-3 shrink-0" />
          <span className="truncate">
            {pullRequest.repo}#{pullRequest.number}
          </span>
          {pullRequest.state != null && (
            <Badge size="xs" variant="outline">
              {pullRequest.state}
            </Badge>
          )}
          <ExternalLink aria-hidden={true} className="size-3 shrink-0" />
        </a>
      )}
    </div>
  );
};
