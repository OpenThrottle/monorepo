import { Badge, TableCell, TableRow } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import {
  SKILL_PRESENCE_BADGED,
  SKILL_PRESENCE_LABELS,
  SKILL_PRESENCE_LINKABLE,
  SKILL_PRESENCE_TOOLTIPS,
} from '~/routing/usage/data/data.skill-presence';
import { SKILL_USAGE_SCOPES } from '~/routing/usage/data/data.skill-usage-copy';
import type { SkillUsageRowWithPresence } from '~/routing/usage/utils/partition-skill-usage-by-presence';
import {
  skillUsageAvgDurationLabel,
  skillUsageOutcomesLabel,
  skillUsageScopeLabel,
} from '~/routing/usage/utils/skill-usage-labels';

export interface SkillUsageLeaderboardRowProps {
  readonly row: SkillUsageRowWithPresence;
}

/**
 * @description One leaderboard row. Links to the skill detail page only when
 * its presence is linkable, and adds a presence badge only for states worth
 * calling out.
 */
export const SkillUsageLeaderboardRow = (
  props: SkillUsageLeaderboardRowProps,
): React.ReactElement => {
  const { row } = props;

  // Hooks

  // Setup
  const isLinkable = SKILL_PRESENCE_LINKABLE[row.presence];
  const isBadged = SKILL_PRESENCE_BADGED[row.presence];
  const scopeColor = row.scope === SKILL_USAGE_SCOPES.OURS ? 'green' : 'orange';
  const hasOutcomes = row.outcomeCount > 0;
  const outcomeTitle = `${row.successCount} success · ${row.errorCount} error — plus ${row.sessionEndedCount} session ended · ${row.abandonedCount} abandoned, which are not outcomes`;
  const noOutcomeTitle = `No outcome reported by this skill. ${row.sessionEndedCount} session ended · ${row.abandonedCount} abandoned — those describe the process, not the work.`;

  // Handlers

  // Markup
  const skillLink = (
    <Link
      className="hover:underline"
      to={`/skills/${encodeURIComponent(row.skillName)}`}
    >
      {row.skillName}
    </Link>
  );
  const skillPlain = <span>{row.skillName}</span>;
  const presenceBadge = (
    <Badge
      color="yellow"
      data-testid="skill-presence-badge"
      size="xs"
      title={SKILL_PRESENCE_TOOLTIPS[row.presence]}
    >
      {SKILL_PRESENCE_LABELS[row.presence]}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TableRow>
      <TableCell className="font-medium">
        <span className="flex flex-wrap items-center gap-2">
          {isLinkable ? skillLink : skillPlain}
          {isBadged ? presenceBadge : null}
        </span>
      </TableCell>
      <TableCell>
        <Badge color={scopeColor} size="xs">
          {skillUsageScopeLabel(row.scope)}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
      <TableCell
        className="text-right tabular-nums"
        title={hasOutcomes ? outcomeTitle : noOutcomeTitle}
      >
        {skillUsageOutcomesLabel(row.outcomeCount, row.count)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {skillUsageAvgDurationLabel(row.avgDurationMs)}
      </TableCell>
    </TableRow>
  );
};
