import * as React from 'react';
import clsx from 'clsx';
import {
  Button,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { SearchAlertIcon } from 'lucide-react';
import { RULES_COPY } from '~/routing/rules/data/data.copy';

export interface RulesEmptyProps {
  className?: string;
  /** When true, show filtered-empty copy and clear-filters CTA. */
  isFiltered?: boolean;
}

/**
 * @description Empty / filtered-empty state for the rules index. Copy and CTAs
 * are single-sourced from {@link RULES_COPY}; used by {@link RulesTable} and
 * available for route-level composition.
 */
export const RulesEmpty = (props: RulesEmptyProps): React.ReactElement => {
  const { className, isFiltered = false } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={clsx('my-8', className)} data-testid="RulesEmpty">
      <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>
        {isFiltered ? RULES_COPY.filteredEmptyTitle : RULES_COPY.emptyTitle}
      </EmptyTitle>
      <EmptyDescription>
        {isFiltered ? RULES_COPY.filteredEmptyBody : RULES_COPY.emptyBody}
      </EmptyDescription>
      <Button asChild={true} variant="secondary">
        {isFiltered ? (
          <Link to="/rules">{RULES_COPY.clearFiltersAction}</Link>
        ) : (
          <Link to="/rules/new">{RULES_COPY.newRuleAction}</Link>
        )}
      </Button>
    </Empty>
  );
};
