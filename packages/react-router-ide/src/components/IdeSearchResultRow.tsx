import * as React from 'react';
import { Badge, cn } from '@openthrottle/react-router-shadcn';
import type { SearchMatch } from '../data/view-models';
import { splitMatchHighlight } from '../utils/splitMatchHighlight';

export interface IdeSearchResultRowProps {
  className?: string;
  /** A single ripgrep match (engine leaf type). */
  match: SearchMatch;
  /** Fired with the match when the row is activated. */
  onSelect?: (match: SearchMatch) => void;
}

/**
 * A single text-search result: `path:line:column` metadata plus the matched line
 * with the matched substring highlighted. Presentational; activation is reported
 * via `onSelect`.
 *
 * @publicApi
 */
export const IdeSearchResultRow = (
  props: IdeSearchResultRowProps,
): React.ReactElement => {
  const { className, match, onSelect } = props;

  // Hooks

  // Setup
  const { mid, post, pre } = splitMatchHighlight({
    column: match.column,
    lineText: match.lineText,
    matchText: match.matchText,
  });

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  return (
    <button
      className={cn(
        'hover:bg-muted focus-visible:bg-muted flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left',
        className,
      )}
      data-testid="IdeSearchResultRow"
      onClick={() => onSelect?.(match)}
      type="button"
    >
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <span className="truncate font-medium">{match.path}</span>
        <Badge size="xs">
          {match.line}:{match.column}
        </Badge>
      </span>
      <code className="w-full truncate font-mono text-xs">
        {pre}
        {mid === '' ? null : (
          <mark className="rounded-sm bg-yellow-500/30 px-0.5">{mid}</mark>
        )}
        {post}
      </code>
    </button>
  );
};
