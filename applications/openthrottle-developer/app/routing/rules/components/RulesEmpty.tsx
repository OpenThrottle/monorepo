import {
  Button,
  cn,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { SearchAlertIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

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
  const { emptyBody, emptyTitle, filteredEmptyBody, filteredEmptyTitle } =
    RULES_COPY;
  const title = isFiltered ? filteredEmptyTitle : emptyTitle;
  const body = isFiltered ? filteredEmptyBody : emptyBody;

  // Handlers

  // Markup
  const clearFiltersLink = (
    <Link to="/rules">{RULES_COPY.clearFiltersAction}</Link>
  );
  const newRuleLink = <Link to="/rules/new">{RULES_COPY.newRuleAction}</Link>;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty className={cn('my-8', className)} data-testid="RulesEmpty">
      <EmptyMedia variant="icon">
        <SearchAlertIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      <EmptyDescription>{body}</EmptyDescription>
      <Button asChild={true} variant="secondary">
        {isFiltered ? clearFiltersLink : newRuleLink}
      </Button>
    </Empty>
  );
};
