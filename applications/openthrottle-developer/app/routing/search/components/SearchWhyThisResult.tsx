import * as React from 'react';
import { Link } from 'react-router';
import type { SearchChunk } from '~/__generated__/graphql';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';
import { githubBlobHref } from '~/routing/search/utils/github-blob-href';
import { planOrTaskDetailHref } from '~/routing/search/utils/plan-or-task-detail-href';

export interface SearchWhyThisResultProps {
  readonly className?: string;
  /** When set (e.g. `details=ranking`), sections start expanded. */
  readonly defaultOpen?: boolean;
  readonly rankMeta?: SearchRankMeta;
  readonly result: SearchChunk;
}

/**
 * @description One-line position label: global index, page, and within-page index.
 */
function formatRankSummary(meta: SearchRankMeta): string {
  const globalIndex = (meta.page - 1) * meta.pageSize + meta.indexOnPage + 1;
  return `Result ${globalIndex} of ${meta.total} (page ${meta.page}, position ${meta.indexOnPage + 1} of ${meta.pageSize} on this page). Ordering is by embedding similarity, not keyword match.`;
}

/**
 * @description Power-user affordance: explains semantic ranking and surfaces chunk metadata for support and debugging.
 */
export function SearchWhyThisResult(props: SearchWhyThisResultProps) {
  const { className, defaultOpen, rankMeta, result } = props;

  const similarityHint =
    result.similarity != null
      ? `Cosine similarity to your query embedding is about ${Math.round(result.similarity * 100)}% (higher means closer in vector space).`
      : 'Ranked by semantic similarity between your query and indexed chunks.';

  const sourceHint =
    result.source === 'documentation'
      ? 'This hit came from ingested documentation.'
      : result.source === 'task'
        ? 'This hit matches text from a task linked to a plan.'
        : 'This hit matches text from a plan chunk.';

  const explanationBody = `OpenThrottle search embeds your query and compares it to plan, task, and documentation chunks (vector similarity). ${sourceHint} ${similarityHint}`;

  const entityIds =
    result.source !== 'documentation' &&
    (result.planId != null ||
      (result.taskId != null && result.taskId !== '')) ? (
      <p className="font-mono text-[11px] text-muted-foreground/90">
        {[
          result.planId != null && result.planId !== ''
            ? `Plan id: ${result.planId}`
            : null,
          result.taskId != null && result.taskId !== ''
            ? `Task id: ${result.taskId}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </p>
    ) : null;

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

  const quickOpenLinks =
    hasDocBlob && result.sourceRepo != null && result.sourcePath != null ? (
      <p
        className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
        data-testid="SearchWhyThisResult-quickOpen"
      >
        <a
          className="font-medium text-primary underline-offset-4 hover:underline"
          data-testid="SearchWhyThisResult-docGithubLink"
          href={githubBlobHref(
            result.sourceRepo,
            result.sourcePath,
            result.sourceSha,
          )}
          rel="noopener noreferrer"
          target="_blank"
        >
          View on GitHub
        </a>
      </p>
    ) : hasPlanJump ? (
      <p
        className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]"
        data-testid="SearchWhyThisResult-quickOpen"
      >
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          data-testid="SearchWhyThisResult-planJumpLink"
          to={`/plans/${result.planId}`}
        >
          Open plan
        </Link>
        {hasTaskJump ? (
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            data-testid="SearchWhyThisResult-taskJumpLink"
            to={planOrTaskDetailHref(result.planId!, result.taskId)}
          >
            Open task on plan
          </Link>
        ) : null}
      </p>
    ) : null;

  return (
    <details
      className={className}
      data-testid="SearchWhyThisResult"
      open={defaultOpen === true}
    >
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        Why this result?
      </summary>
      <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        {rankMeta != null ? (
          <p className="text-[11px] text-foreground/90">
            {formatRankSummary(rankMeta)}
          </p>
        ) : null}
        <p>{explanationBody}</p>
        <p className="font-mono text-[11px] text-muted-foreground/90">{`Chunk id: ${result.id}`}</p>
        {entityIds}
        {quickOpenLinks != null ? (
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-foreground/90">
              Quick open
            </p>
            {quickOpenLinks}
          </div>
        ) : null}
        {result.source === 'documentation' &&
          (result.sourceRepo != null || result.sourcePath != null) && (
            <p className="font-mono text-[11px] text-muted-foreground/90">
              {[
                result.sourceRepo != null && result.sourceRepo !== ''
                  ? `Repo: ${result.sourceRepo}`
                  : null,
                result.sourcePath != null && result.sourcePath !== ''
                  ? `Path: ${result.sourcePath}`
                  : null,
                result.sourceSha != null && result.sourceSha !== ''
                  ? `SHA: ${result.sourceSha.slice(0, 7)}`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        <p className="border-t border-border pt-2 text-[11px] text-muted-foreground">
          <strong className="font-medium text-foreground/90">Tuning:</strong>{' '}
          the API returns the strongest matches first. Use a tighter query for
          fewer off-topic hits; lower{' '}
          <strong className="font-medium">Results per page</strong> in filters
          when you only need the top slice.
        </p>
      </div>
    </details>
  );
}
