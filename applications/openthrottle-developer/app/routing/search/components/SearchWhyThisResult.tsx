import * as React from 'react';
import type { SearchChunk } from '~/__generated__/graphql';

export interface SearchWhyThisResultProps {
  readonly className?: string;
  readonly result: SearchChunk;
}

/**
 * @description Power-user affordance: explains semantic ranking and surfaces chunk metadata for support and debugging.
 */
export function SearchWhyThisResult(props: SearchWhyThisResultProps) {
  const { className, result } = props;

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

  return (
    <details className={className} data-testid="SearchWhyThisResult">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        Why this result?
      </summary>
      <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p>{explanationBody}</p>
        <p className="font-mono text-[11px] text-muted-foreground/90">{`Chunk id: ${result.id}`}</p>
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
      </div>
    </details>
  );
}
