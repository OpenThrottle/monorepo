import * as React from 'react';
import { Badge, cn } from '@openthrottle/react-router-shadcn';
import type { SearchMatch } from '../data/view-models';

export interface IdeSearchResultRowProps {
  className?: string;
  /** A single ripgrep match (engine leaf type). */
  match: SearchMatch;
  /** Fired with the match when the row is activated. */
  onSelect?: (match: SearchMatch) => void;
}

/** Split a line into the segments before/at/after the matched substring. */
const splitHighlight = (
  lineText: string,
  matchText: string,
  column: number,
): { mid: string; post: string; pre: string } => {
  const start = column - 1;
  const fitsAtColumn =
    start >= 0 && lineText.slice(start, start + matchText.length) === matchText;
  const index = fitsAtColumn ? start : lineText.indexOf(matchText);

  if (matchText === '' || index < 0) {
    return { mid: '', post: '', pre: lineText };
  }

  return {
    mid: lineText.slice(index, index + matchText.length),
    post: lineText.slice(index + matchText.length),
    pre: lineText.slice(0, index),
  };
};

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

  // Setup
  const { mid, post, pre } = splitHighlight(
    match.lineText,
    match.matchText,
    match.column,
  );

  // Markup
  return (
    <button
      className={cn(
        'flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted',
        className,
      )}
      data-testid="IdeSearchResultRow"
      onClick={() => onSelect?.(match)}
      type="button"
    >
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
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
