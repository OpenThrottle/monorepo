import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
  skillUsageAvgDurationLabel,
  skillUsageOutcomesLabel,
  skillUsageScopeLabel,
} from '~/routing/usage/data/skill-usage-copy';
import type { UsageSkillUsageBySkillFragment } from '~/__generated__/graphql';

export interface SkillUsageLeaderboardProps {
  bySkill: readonly UsageSkillUsageBySkillFragment[];
  className?: string;
  /**
   * Skill names that resolve to an on-disk `/skills/$slug` detail page. A row is
   * rendered as a link only when its `skillName` is linkable — third-party /
   * plugin-namespaced ids with no on-disk skill stay plain text (no 404 links).
   */
  linkableSlugs: ReadonlySet<string> | readonly string[];
}

/**
 * @description Shared "Top skills" leaderboard table (Skill / Scope /
 * Invocations / Outcomes / Avg duration). Extracted from `UsageSkillUsage` so
 * both `/usage` and the `/skills` index render the identical table. Callers own
 * the surrounding heading and the empty-state message.
 */
export const SkillUsageLeaderboard = (
  props: SkillUsageLeaderboardProps,
): React.ReactElement => {
  const { bySkill, className, linkableSlugs } = props;

  // Hooks

  // Setup
  const linkableSlugSet = React.useMemo(
    () =>
      linkableSlugs instanceof Set ? linkableSlugs : new Set(linkableSlugs),
    [linkableSlugs],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('overflow-x-auto', className)}
      data-testid="SkillUsageLeaderboard"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Skill</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead className="text-right">Invocations</TableHead>
            <TableHead className="text-right">
              {SKILL_USAGE_COPY.outcomesColumn}
            </TableHead>
            <TableHead className="text-right">
              {SKILL_USAGE_COPY.avgDurationColumn}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bySkill.map((row) => (
            <TableRow key={`${row.skillName}:${row.scope}`}>
              <TableCell className="font-medium">
                {linkableSlugSet.has(row.skillName) ? (
                  <Link
                    className="hover:underline"
                    to={`/skills/${encodeURIComponent(row.skillName)}`}
                  >
                    {row.skillName}
                  </Link>
                ) : (
                  row.skillName
                )}
              </TableCell>
              <TableCell>
                <Badge
                  color={
                    row.scope === SKILL_USAGE_SCOPES.OURS ? 'green' : 'orange'
                  }
                  size="xs"
                >
                  {skillUsageScopeLabel(row.scope)}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.count}
              </TableCell>
              <TableCell
                className="text-right tabular-nums"
                title={
                  row.outcomeCount > 0
                    ? `${row.successCount} success · ${row.abandonedCount} abandoned · ${row.errorCount} error`
                    : 'No opt-in outcome reported (valid for third-party and uninstrumented skills)'
                }
              >
                {skillUsageOutcomesLabel(row.outcomeCount, row.count)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {skillUsageAvgDurationLabel(row.avgDurationMs)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
