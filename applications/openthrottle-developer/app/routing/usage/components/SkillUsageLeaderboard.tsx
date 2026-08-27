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
  SKILL_PRESENCE_BADGED,
  SKILL_PRESENCE_LABELS,
  SKILL_PRESENCE_LINKABLE,
  SKILL_PRESENCE_TOOLTIPS,
} from '~/routing/usage/data/skill-presence';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
  skillUsageAvgDurationLabel,
  skillUsageOutcomesLabel,
  skillUsageScopeLabel,
} from '~/routing/usage/data/skill-usage-copy';
import type { SkillUsageRowWithPresence } from '~/routing/usage/utils/partition-skill-usage-by-presence';

export interface SkillUsageLeaderboardProps {
  /**
   * Rows to render, each carrying its resolved presence. The caller owns
   * partitioning (see `partitionSkillUsageByPresence`) and hands this table
   * exactly the rows it wants in this table — nothing is filtered here.
   */
  bySkill: readonly SkillUsageRowWithPresence[];
  className?: string;
}

/**
 * @description Shared "Top skills" leaderboard table (Skill / Scope /
 * Invocations / Outcomes / Avg duration). Extracted from `UsageSkillUsage` so
 * both `/usage` and the `/skills` index render the identical table. Callers own
 * the surrounding heading, the empty-state message, and the partitioning — this
 * table renders exactly the rows it is given, in the order it is given them.
 *
 * A row links to its `/skills/$slug` detail page only when its presence is
 * linkable, so third-party ids and skills that have left the checkout never
 * produce a 404 link. Presence and scope are different axes: the Scope badge
 * column stays, and a presence badge is added alongside the name only for the
 * states worth calling out.
 */
export const SkillUsageLeaderboard = (
  props: SkillUsageLeaderboardProps,
): React.ReactElement => {
  const { bySkill, className } = props;

  // Hooks

  // Setup

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
                <span className="flex flex-wrap items-center gap-2">
                  {SKILL_PRESENCE_LINKABLE[row.presence] ? (
                    <Link
                      className="hover:underline"
                      to={`/skills/${encodeURIComponent(row.skillName)}`}
                    >
                      {row.skillName}
                    </Link>
                  ) : (
                    <span>{row.skillName}</span>
                  )}
                  {SKILL_PRESENCE_BADGED[row.presence] ? (
                    <Badge
                      color="yellow"
                      data-testid="skill-presence-badge"
                      size="xs"
                      title={SKILL_PRESENCE_TOOLTIPS[row.presence]}
                    >
                      {SKILL_PRESENCE_LABELS[row.presence]}
                    </Badge>
                  ) : null}
                </span>
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
