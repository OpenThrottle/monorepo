import { cn } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { Link } from 'react-router';

import { RulePreviewConditionBadges } from '~/routing/rules/components/RulePreviewConditionBadges';
import { RulePreviewEnvironmentSelect } from '~/routing/rules/components/RulePreviewEnvironmentSelect';
import { RULE_PREVIEW_COPY } from '~/routing/rules/data/copy';
import type { RulePreviewState } from '~/routing/rules/types';

export interface RulePreviewSectionProps {
  readonly className?: string;
  readonly projectNames: ReadonlyMap<string, string>;
  readonly repositoryNames: ReadonlyMap<string, string>;
  readonly state: RulePreviewState;
}

/**
 * @description The rule detail page's "Why does or doesn't this match?" section: the environment
 * to preview in, the plans the rule matches, and a sample of the ones it does not with a badge per
 * condition. A plan with no repository says so, since that is the usual reason a
 * repository-scoped rule never fires; a plan's project follows when it has one.
 */
export const RulePreviewSection = (
  props: RulePreviewSectionProps,
): React.ReactElement => {
  const { className, projectNames, repositoryNames, state } = props;

  // Hooks

  // Setup
  const preview = state.kind === 'ready' ? state.preview : null;
  const repositoryLabel = (repositoryId: string | null | undefined): string => {
    if (repositoryId == null) return RULE_PREVIEW_COPY.noRepositoryLabel;
    return repositoryNames.get(repositoryId) ?? repositoryId;
  };
  const scopeLabel = (plan: {
    readonly projectId?: string | null;
    readonly repositoryId?: string | null;
  }): string => {
    const repository = repositoryLabel(plan.repositoryId);
    if (plan.projectId == null) return repository;

    return `${repository} · ${projectNames.get(plan.projectId) ?? plan.projectId}`;
  };

  // Handlers

  // Markup
  const matchedItems = (preview?.matched ?? []).map((plan) => (
    <li
      className="flex items-center justify-between gap-2 p-3"
      data-testid="RulePreviewMatchedPlan"
      key={plan.id}
    >
      <Link className="hover:underline" to={`/plans/${plan.id}`}>
        {plan.title}
      </Link>
      <span className="text-muted-foreground text-xs">
        {plan.status} · {scopeLabel(plan)}
      </span>
    </li>
  ));
  const nonMatchingItems = (preview?.nonMatching ?? []).map((plan) => (
    <li
      className="flex flex-col gap-2 p-3"
      data-testid="RulePreviewNonMatchingPlan"
      key={plan.id}
    >
      <div className="flex items-center justify-between gap-2">
        <Link className="hover:underline" to={`/plans/${plan.id}`}>
          {plan.title}
        </Link>
        <span className="text-muted-foreground text-xs">
          {plan.status} · {scopeLabel(plan)}
        </span>
      </div>
      <RulePreviewConditionBadges plan={plan} />
    </li>
  ));
  const truncated = preview?.truncated === true && (
    <p
      className="text-muted-foreground text-xs"
      data-testid="RulePreviewTruncated"
    >
      {RULE_PREVIEW_COPY.truncatedNote}
    </p>
  );
  const matchedList = (
    <ul className="bg-card ui-border divide-y rounded-lg border">
      {matchedItems}
    </ul>
  );
  const matchedEmpty = (
    <p className="text-muted-foreground text-sm">
      {RULE_PREVIEW_COPY.matchedEmpty}
    </p>
  );
  const nonMatchingList = (
    <ul className="bg-card ui-border divide-y rounded-lg border">
      {nonMatchingItems}
    </ul>
  );
  const nonMatchingEmpty = (
    <p className="text-muted-foreground text-sm">
      {RULE_PREVIEW_COPY.nonMatchingEmpty}
    </p>
  );
  const readyBody = (
    <>
      <p data-testid="RulePreviewTotals">
        {RULE_PREVIEW_COPY.summaryPrefix} {preview?.matchedCount}{' '}
        {RULE_PREVIEW_COPY.summaryOf} {preview?.evaluated}{' '}
        {RULE_PREVIEW_COPY.summaryPlans}
      </p>
      {truncated}
      <h3 className="text-sm font-semibold">
        {RULE_PREVIEW_COPY.matchedTitle}
      </h3>
      {matchedItems.length === 0 ? matchedEmpty : matchedList}
      <h3 className="text-sm font-semibold">
        {RULE_PREVIEW_COPY.nonMatchingTitle}
      </h3>
      {nonMatchingItems.length === 0 ? nonMatchingEmpty : nonMatchingList}
    </>
  );
  const failure = state.kind === 'error' && (
    <p className="text-destructive text-sm" role="alert">
      {RULE_PREVIEW_COPY.errorPrefix} {state.message}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={cn('flex flex-col gap-3', className)}
      data-testid="RulePreviewSection"
    >
      <div>
        <GlobalHeading
          heading="h2"
          size="lg"
          title={RULE_PREVIEW_COPY.sectionTitle}
        />
        <p className="text-muted-foreground text-sm">
          {RULE_PREVIEW_COPY.sectionDescription}
        </p>
      </div>
      <RulePreviewEnvironmentSelect />
      {failure}
      {preview != null && readyBody}
    </section>
  );
};
