import * as React from 'react';
import clsx from 'clsx';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { UsageSkillUsageChart } from '~/routing/usage/components/UsageSkillUsageChart';
import { UsageSkillUsageFilters } from '~/routing/usage/components/UsageSkillUsageFilters';
import { UsageSkillUsageSummary } from '~/routing/usage/components/UsageSkillUsageSummary';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
  skillUsageScopeLabel,
  type SkillUsageScopeFilter,
} from '~/routing/usage/data/skill-usage-copy';
import type {
  UsageSkillUsageByDayFragment,
  UsageSkillUsageByScopeFragment,
  UsageSkillUsageBySkillFragment,
  UsageSkillUsageFilterOptionsFragment,
} from '~/__generated__/graphql';

export interface UsageSkillUsageProps {
  byDay: readonly UsageSkillUsageByDayFragment[];
  byScope: readonly UsageSkillUsageByScopeFragment[];
  bySkill: readonly UsageSkillUsageBySkillFragment[];
  className?: string;
  filterOptions: UsageSkillUsageFilterOptionsFragment;
  /** Current `?provider=` (token usage); preserved when skill filters change. */
  providerParam: string | null;
  rangeDays: number;
  selectedCwd: string | null;
  selectedGitBranch: string | null;
  selectedScope: SkillUsageScopeFilter;
  totalCount: number;
}

export const UsageSkillUsage = (
  props: UsageSkillUsageProps,
): React.ReactElement => {
  const {
    byDay,
    byScope,
    bySkill,
    className,
    filterOptions,
    providerParam,
    rangeDays,
    selectedCwd,
    selectedGitBranch,
    selectedScope,
    totalCount,
  } = props;

  // Hooks

  // Setup
  const hasFilters =
    selectedScope != null || selectedGitBranch != null || selectedCwd != null;
  const emptyMessage = hasFilters
    ? SKILL_USAGE_COPY.emptyFiltered
    : SKILL_USAGE_COPY.empty;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('mt-8', className)} data-testid="UsageSkillUsage">
      <GlobalHeading
        className="mb-4"
        heading="h2"
        title={SKILL_USAGE_COPY.heading}
      />
      <p className="text-muted-foreground mb-4 text-sm md:mb-6">
        {SKILL_USAGE_COPY.intro(rangeDays)}
      </p>

      <UsageSkillUsageFilters
        filterOptions={filterOptions}
        providerParam={providerParam}
        selectedCwd={selectedCwd}
        selectedGitBranch={selectedGitBranch}
        selectedScope={selectedScope}
      />

      <UsageSkillUsageSummary byScope={byScope} totalCount={totalCount} />

      <GlobalHeading
        className="mb-3"
        heading="h3"
        title={SKILL_USAGE_COPY.overTimeHeading}
      />
      <UsageSkillUsageChart className="mb-8" data={byDay} />

      <GlobalHeading
        className="mb-3"
        heading="h3"
        title={SKILL_USAGE_COPY.leaderboardHeading}
      />
      {bySkill.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="UsageSkillUsageEmpty"
        >
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Skill</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Invocations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySkill.map((row) => (
                <TableRow key={`${row.skillName}:${row.scope}`}>
                  <TableCell className="font-medium">{row.skillName}</TableCell>
                  <TableCell>
                    <Badge
                      color={
                        row.scope === SKILL_USAGE_SCOPES.OURS
                          ? 'green'
                          : 'orange'
                      }
                      size="xs"
                    >
                      {skillUsageScopeLabel(row.scope)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
