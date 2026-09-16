import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import * as React from 'react';

import type { UsageSkillUsageByScopeFragment } from '~/__generated__/graphql';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
} from '~/routing/usage/data/skill-usage-copy';
import { skillUsageScopeCount } from '~/routing/usage/utils/skill-usage-scope-count';

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
  const scopeTiles: ReadonlyArray<{
    hint: string;
    label: string;
    total: number;
  }> = [
    {
      hint: SKILL_USAGE_COPY.scopeOursHint,
      label: 'Ours',
      total: skillUsageScopeCount(byScope, SKILL_USAGE_SCOPES.OURS),
    },
    {
      hint: SKILL_USAGE_COPY.scopePersonalHint,
      label: 'Personal',
      total: skillUsageScopeCount(byScope, SKILL_USAGE_SCOPES.PERSONAL),
    },
    {
      hint: SKILL_USAGE_COPY.scopeThirdPartyHint,
      label: 'Third-party',
      total: skillUsageScopeCount(byScope, SKILL_USAGE_SCOPES.THIRD_PARTY),
    },
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
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
      {scopeTiles.map((tile) => (
        <Card className="gap-0 py-4" key={tile.label}>
          <CardHeader className="px-4">
            <CardTitle className="text-muted-foreground text-xs font-medium">
              {SKILL_USAGE_COPY.scopeSplitHeading} — {tile.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-foreground text-xl font-semibold tabular-nums">
              {tile.total}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">{tile.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
