import * as React from 'react';
import clsx from 'clsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
} from '~/routing/usage/data/skill-usage-copy';
import { skillUsageScopeCount } from '~/routing/usage/utils/skill-usage-scope-count';
import type { UsageSkillUsageByScopeFragment } from '~/__generated__/graphql';

export interface UsageSkillUsageSummaryProps {
  byScope: readonly UsageSkillUsageByScopeFragment[];
  className?: string;
  totalCount: number;
}

export const UsageSkillUsageSummary = (
  props: UsageSkillUsageSummaryProps,
): React.ReactElement => {
  const { byScope, className, totalCount } = props;

  // Hooks

  // Setup
  const oursTotal = skillUsageScopeCount(byScope, SKILL_USAGE_SCOPES.OURS);
  const thirdPartyTotal = skillUsageScopeCount(
    byScope,
    SKILL_USAGE_SCOPES.THIRD_PARTY,
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3', className)}
      data-testid="UsageSkillUsageSummary"
    >
      <Card className="gap-0 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-muted-foreground text-xs font-medium">
            Total invocations
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="text-foreground text-xl font-semibold tabular-nums">
            {totalCount}
          </div>
        </CardContent>
      </Card>
      <Card className="gap-0 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-muted-foreground text-xs font-medium">
            {SKILL_USAGE_COPY.scopeSplitHeading} — Ours
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="text-foreground text-xl font-semibold tabular-nums">
            {oursTotal}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {SKILL_USAGE_COPY.scopeOursHint}
          </p>
        </CardContent>
      </Card>
      <Card className="gap-0 py-4">
        <CardHeader className="px-4">
          <CardTitle className="text-muted-foreground text-xs font-medium">
            {SKILL_USAGE_COPY.scopeSplitHeading} — Third-party
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <div className="text-foreground text-xl font-semibold tabular-nums">
            {thirdPartyTotal}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {SKILL_USAGE_COPY.scopeThirdPartyHint}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
