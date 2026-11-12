import * as React from 'react';
import { Link } from 'react-router';

import type { SearchChunk } from '~/__generated__/graphql';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';
import { formatRankSummary } from '~/routing/search/utils/formatRankSummary';
import { githubBlobHref } from '~/routing/search/utils/githubBlobHref';
import { planOrTaskDetailHref } from '~/routing/search/utils/planOrTaskDetailHref';
import {
  describeSimilarity,
  describeSource,
  formatDocSourceMeta,
  formatEntityIds,
} from '~/routing/search/utils/search-why-hints';

export interface SearchWhyThisResultProps {
  className?: string;
  /** When set (e.g. `details=ranking`), sections start expanded. */
  defaultOpen?: boolean;
  rankMeta?: SearchRankMeta;
  result: SearchChunk;
}

/**
 * @description Power-user affordance: explains semantic ranking and surfaces chunk metadata for support and debugging.
 */
export const SearchWhyThisResult = (
  props: SearchWhyThisResultProps,
): React.ReactElement => {
  const { className, defaultOpen, rankMeta, result } = props;

  // Hooks

  // Setup
  const similarityHint = describeSimilarity(result.similarity);
  const sourceHint = describeSource(result.source);

  const explanationBody = `OpenThrottle search embeds your query and compares it to plan, task, and documentation chunks (vector similarity). ${sourceHint} ${similarityHint}`;

  const hasEntityIds =
    result.source !== 'documentation' &&
    (result.planId != null || (result.taskId != null && result.taskId !== ''));

  const hasDocBlob =
    result.source === 'documentation' &&
    result.sourceRepo != null &&
    result.sourceRepo !== '' &&
    result.sourcePath != null &&
    result.sourcePath !== '';

  const hasPlanJump =
    result.planId != null &&
    result.planId !== '' &&
    result.source !== 'documentation';

  const hasTaskJump =
    hasPlanJump && result.taskId != null && result.taskId !== '';

  const hasDocSourceMeta =
    result.source === 'documentation' &&
    (result.sourceRepo != null || result.sourcePath != null);

  const rankSummaryText = rankMeta == null ? null : formatRankSummary(rankMeta);

  // Handlers
  const renderQuickOpenLinks = (): React.ReactNode => {
    const { planId, sourcePath, sourceRepo, sourceSha, taskId } = result;

    if (hasDocBlob && sourceRepo != null && sourcePath != null) {
      return (
        <p
          className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
          data-testid="SearchWhyThisResult-quickOpen"
        >
          <a
            className="text-primary font-medium underline-offset-4 hover:underline"
            data-testid="SearchWhyThisResult-docGithubLink"
            href={githubBlobHref(sourceRepo, sourcePath, sourceSha)}
            rel="noopener noreferrer"
            target="_blank"
          >
            View on GitHub
          </a>
        </p>
      );
    }

    if (hasPlanJump && planId != null) {
      const taskJumpLink = (
        <Link
          className="text-primary font-medium underline-offset-4 hover:underline"
          data-testid="SearchWhyThisResult-taskJumpLink"
          to={planOrTaskDetailHref(planId, taskId)}
        >
          Open task on plan
        </Link>
      );

      return (
        <p
          className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
          data-testid="SearchWhyThisResult-quickOpen"
        >
          <Link
            className="text-primary font-medium underline-offset-4 hover:underline"
            data-testid="SearchWhyThisResult-planJumpLink"
            prefetch="intent"
            to={`/plans/${planId}`}
          >
            Open plan
          </Link>
          {hasTaskJump ? taskJumpLink : null}
        </p>
      );
    }

    return null;
  };

  // Markup
  const quickOpenLinks = renderQuickOpenLinks();
  const rankSummary = (
    <p className="text-foreground/90 text-[11px]">{rankSummaryText}</p>
  );
  const entityIds = (
    <p className="text-muted-foreground/90 font-mono text-[11px]">
      {formatEntityIds(result.planId, result.taskId)}
    </p>
  );
  const quickOpen = (
    <div className="space-y-1">
      <p className="text-foreground/90 text-[11px] font-medium">Quick open</p>
      {quickOpenLinks}
    </div>
  );
  const docSourceMeta = (
    <p className="text-muted-foreground/90 font-mono text-[11px]">
      {formatDocSourceMeta(
        result.sourceRepo,
        result.sourcePath,
        result.sourceSha,
      )}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <details
      className={className}
      data-testid="SearchWhyThisResult"
      open={defaultOpen === true}
    >
      <summary className="text-muted-foreground cursor-pointer text-xs font-medium">
        Why this result?
      </summary>
      <div className="border-border bg-muted/40 text-muted-foreground mt-2 space-y-2 rounded-md border p-3 text-xs">
        {rankSummaryText != null ? rankSummary : null}
        <p>{explanationBody}</p>
        <p className="text-muted-foreground/90 font-mono text-[11px]">{`Chunk id: ${result.id}`}</p>
        {hasEntityIds ? entityIds : null}
        {quickOpenLinks != null ? quickOpen : null}
        {hasDocSourceMeta ? docSourceMeta : null}
        <p className="border-border text-muted-foreground border-t pt-2 text-[11px]">
          <strong className="text-foreground/90 font-medium">Tuning:</strong>{' '}
          the API returns the strongest matches first. Use a tighter query for
          fewer off-topic hits; lower{' '}
          <strong className="font-medium">Results per page</strong> in filters
          when you only need the top slice.
        </p>
      </div>
    </details>
  );
};
