import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SearchIcon } from 'lucide-react';

export interface SearchIntroductionProps {
  className?: string;
  expandRankingDetails?: boolean;
  hasQuery?: boolean;
  onExpandRankingChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SearchIntroduction = (
  props: SearchIntroductionProps,
): React.ReactElement => {
  const {
    className,
    expandRankingDetails = false,
    hasQuery = false,
    onExpandRankingChange,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="SearchIntroduction">
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={SearchIcon}
        title="Search"
      />

      {!hasQuery ? (
        <p className="text-muted-foreground mb-4 text-sm">
          Enter a query below for semantic search across embedded plans, tasks,
          and documentation. Results are ranked by embedding similarity—open{' '}
          <strong className="text-foreground font-medium">
            Why this result?
          </strong>{' '}
          on any hit for scores and ids, or use power-user mode after you run a
          search to expand ranking details on every card.
        </p>
      ) : (
        <p className="text-muted-foreground mb-4 text-sm">
          Semantic search over embedded plan, task, and documentation chunks.
        </p>
      )}

      {hasQuery && onExpandRankingChange != null ? (
        <div className="text-muted-foreground mb-2 space-y-2 text-sm">
          <p>
            Open “Why this result?” on a card to see ranking notes, similarity,
            and entity ids. Enable power-user mode below to expand every card’s
            ranking section and add result position labels.
          </p>
          <label className="text-foreground flex cursor-pointer items-center gap-2">
            <input
              aria-label="Expand ranking details on all results"
              checked={expandRankingDetails}
              className="border-input rounded"
              onChange={onExpandRankingChange}
              type="checkbox"
            />
            <span>
              Power user: expand ranking details (sets{' '}
              <code className="bg-muted rounded px-1 text-[11px]">
                details=ranking
              </code>{' '}
              in the URL; preserved when paging)
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
};
