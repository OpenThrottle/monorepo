import {
  cn,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { SkillUsageLeaderboardRow } from '~/routing/usage/components/SkillUsageLeaderboardRow';
import { SKILL_USAGE_COPY } from '~/routing/usage/data/data.skill-usage-copy';
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
      className={cn('overflow-x-auto', className)}
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
            <SkillUsageLeaderboardRow
              key={`${row.skillName}:${row.scope}`}
              row={row}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
