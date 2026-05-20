import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SearchIcon } from 'lucide-react';

export interface SearchIntroductionProps {
  className?: string;
  expandRankingDetails?: boolean;
  hasQuery?: boolean;
  onExpandRankingChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SearchIntroduction = (props: SearchIntroductionProps) => {
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
        <p className="mb-4 text-sm text-muted-foreground">
          Enter a query below for semantic search across embedded plans, tasks,
          and documentation. Results are ranked by embedding similarity—open{' '}
          <strong className="font-medium text-foreground">
            Why this result?
          </strong>{' '}
          on any hit for scores and ids, or use power-user mode after you run a
          search to expand ranking details on every card.
        </p>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">
          Semantic search over embedded plan, task, and documentation chunks.
        </p>
      )}

      {hasQuery && onExpandRankingChange != null ? (
        <div className="mb-2 max-w-2xl space-y-2 text-sm text-muted-foreground">
          <p>
            Open “Why this result?” on a card to see ranking notes, similarity,
            and entity ids. Enable power-user mode below to expand every card’s
            ranking section and add result position labels.
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-foreground">
            <input
              aria-label="Expand ranking details on all results"
              checked={expandRankingDetails}
              className="rounded border-input"
              onChange={onExpandRankingChange}
              type="checkbox"
            />
            <span>
              Power user: expand ranking details (sets{' '}
              <code className="rounded bg-muted px-1 text-[11px]">
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
