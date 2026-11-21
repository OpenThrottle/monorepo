import { Badge, cn } from '@openthrottle/react-router-shadcn';
import { ChevronRightIcon } from 'lucide-react';
import * as React from 'react';

import { RULES_COPY } from '~/routing/rules/data/data.copy';
import type { RuleScopeStep } from '~/routing/rules/utils/formatters';

export interface RulesScopeBadgesProps {
  readonly className?: string;
  readonly trail: readonly RuleScopeStep[];
}

/**
 * @description The scope trail as a compact badge sequence, widest rung first
 * (Global or repository, then environment, then status). Decorative chevrons
 * are hidden from assistive tech; the list carries the reading order.
 */
export const RulesScopeBadges = (
  props: RulesScopeBadgesProps,
): React.ReactElement => {
  const { className, trail } = props;

  // Hooks

  // Setup
  const titles = {
    environment: RULES_COPY.environmentLabel,
    global: undefined,
    repository: RULES_COPY.repositoryLabel,
    status: RULES_COPY.statusLabel,
    unknown: RULES_COPY.repositoryLabel,
  };

  // Handlers

  // Markup
  const steps = trail.map((step, index) => (
    <li className="flex items-center gap-1" key={`${step.kind}-${step.label}`}>
      {index > 0 && (
        <ChevronRightIcon
          aria-hidden="true"
          className="text-muted-foreground size-3"
        />
      )}
      <Badge
        className={cn(step.kind === 'unknown' && 'border-amber-500/60')}
        data-scope-kind={step.kind}
        title={titles[step.kind]}
        variant={index === 0 ? 'secondary' : 'outline'}
      >
        {step.label}
      </Badge>
    </li>
  ));

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ol
      className={cn('flex flex-wrap items-center gap-1 p-2', className)}
      data-testid="RulesScopeBadges"
    >
      {steps}
    </ol>
  );
};
