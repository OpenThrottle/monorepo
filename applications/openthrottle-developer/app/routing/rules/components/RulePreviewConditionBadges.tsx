import { Badge, cn } from '@openthrottle/react-router-shadcn';
import { CheckIcon, XIcon } from 'lucide-react';
import * as React from 'react';

import { RULE_PREVIEW_COPY } from '~/routing/rules/data/data.copy';
import type { RulePreviewNonMatch } from '~/routing/rules/types';
import { selectVisibleConditions } from '~/routing/rules/utils/rule-preview-conditions';

export interface RulePreviewConditionBadgesProps {
  readonly className?: string;
  readonly plan: RulePreviewNonMatch;
}

const conditionLabels = new Map<string, string>(
  Object.entries(RULE_PREVIEW_COPY.conditionLabels),
);

/**
 * @description One badge per match condition of a non-matching plan, passed or failed, with the
 * rule's requirement and the plan's value on the badge title. Below them: the tags the plan
 * lacks, and a note when only the environment differs.
 */
export const RulePreviewConditionBadges = (
  props: RulePreviewConditionBadgesProps,
): React.ReactElement => {
  const { className, plan } = props;

  // Hooks

  // Setup
  const visible = selectVisibleConditions(plan.conditions);

  // Handlers

  // Markup
  const badges = visible.map((result) => {
    const Icon = result.passed ? CheckIcon : XIcon;

    return (
      <Badge
        className={cn(
          'gap-1',
          result.passed && 'bg-muted',
          !result.passed && 'border-destructive text-destructive',
        )}
        data-condition={result.condition}
        data-passed={result.passed}
        data-testid="RulePreviewCondition"
        key={result.condition}
        title={`${result.expected ?? '—'} / ${result.actual ?? '—'}`}
        variant="outline"
      >
        <Icon aria-hidden={true} className="size-3" />
        {conditionLabels.get(result.condition) ?? result.condition}
      </Badge>
    );
  });
  const missingTags = plan.missingTags.length > 0 && (
    <p
      className="text-muted-foreground text-xs"
      data-testid="RulePreviewMissingTags"
    >
      {RULE_PREVIEW_COPY.missingTagsLabel}: {plan.missingTags.join(', ')}
    </p>
  );
  const environmentOnly = plan.failedOnlyOnEnvironment && (
    <p className="text-xs" data-testid="RulePreviewEnvironmentOnly">
      {RULE_PREVIEW_COPY.environmentOnlyNote}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex flex-wrap gap-1">{badges}</div>
      {missingTags}
      {environmentOnly}
    </div>
  );
};
