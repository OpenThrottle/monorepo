import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { Badge } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SkillUsageDailyChart } from '~/global/components/SkillUsageDailyChart';
import { SkillUsageStatTile } from '~/routing/skills/components/SkillUsageStatTile';
import { SKILL_USAGE_DETAIL_COPY } from '~/routing/skills/data/data.copy';
import {
  skillUsageLastUsedLabel,
  skillUsageSuccessRateLabel,
  type SkillDetailUsageData,
} from '~/routing/skills/data/skill-usage-detail';
import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPES,
  skillUsageAvgDurationLabel,
  skillUsageOutcomesLabel,
  skillUsageScopeLabel,
} from '~/routing/usage/data/skill-usage-copy';

export interface SkillDetailUsageProps {
  className?: string;
  rangeDays: number;
  usage: SkillDetailUsageData;
}

/**
 * @description Per-skill usage stats card for /skills/$slug (last 30 days,
 * single skill). Six headline tiles, an outcome breakdown, and the shared daily
 * chart. Degrades to an informational notice for the empty (never invoked) and
 * unavailable (no settings:read / server error) states — never an error boundary.
 */
export const SkillDetailUsage = (
  props: SkillDetailUsageProps,
): React.ReactElement => {
  const { className, rangeDays, usage } = props;

  // Hooks

  // Setup
  const skill = usage.available ? usage.skill : null;

  // Handlers

  // Markup
  const header = (
    <div className="mb-4 flex items-center justify-between gap-3">
      <GlobalHeading heading="h2" title={SKILL_USAGE_DETAIL_COPY.heading} />
      <Link
        className="text-muted-foreground text-sm hover:underline"
        to="/usage"
      >
        {SKILL_USAGE_DETAIL_COPY.backToUsage}
      </Link>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (!usage.available) {
    return (
      <div className={clsx('mt-8', className)} data-testid="SkillDetailUsage">
        {header}
        <p
          className="text-muted-foreground text-sm"
          data-testid="SkillDetailUsageUnavailable"
        >
          {SKILL_USAGE_DETAIL_COPY.unavailableNotice}
        </p>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className={clsx('mt-8', className)} data-testid="SkillDetailUsage">
        {header}
        <p
          className="text-muted-foreground text-sm"
          data-testid="SkillDetailUsageEmpty"
        >
          {SKILL_USAGE_DETAIL_COPY.emptyNotice}
        </p>
      </div>
    );
  }

  return (
    <div className={clsx(className)} data-testid="SkillDetailUsage">
      {header}
      <p className="text-muted-foreground mb-4 text-sm">
        {SKILL_USAGE_DETAIL_COPY.intro(rangeDays)}
      </p>

      <div
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        data-testid="SkillDetailUsageStats"
      >
        <SkillUsageStatTile
          label={SKILL_USAGE_DETAIL_COPY.totalTile}
          value={skill.count}
        />
        <SkillUsageStatTile
          label={SKILL_USAGE_DETAIL_COPY.scopeTile}
          value={
            <Badge
              color={
                skill.scope === SKILL_USAGE_SCOPES.OURS ? 'green' : 'orange'
              }
              size="xs"
            >
              {skillUsageScopeLabel(skill.scope)}
            </Badge>
          }
        />
        <SkillUsageStatTile
          label={SKILL_USAGE_DETAIL_COPY.outcomesTile}
          value={skillUsageOutcomesLabel(skill.outcomeCount, skill.count)}
        />
        <SkillUsageStatTile
          label={SKILL_USAGE_DETAIL_COPY.successRateTile}
          value={skillUsageSuccessRateLabel(
            skill.successCount,
            skill.outcomeCount,
          )}
        />
        <SkillUsageStatTile
          label={SKILL_USAGE_DETAIL_COPY.avgDurationTile}
          value={skillUsageAvgDurationLabel(skill.avgDurationMs)}
        />
        <SkillUsageStatTile
          label={SKILL_USAGE_DETAIL_COPY.lastUsedTile}
          value={skillUsageLastUsedLabel(skill.lastUsedAt)}
        />
      </div>

      <GlobalHeading
        className="mb-3"
        heading="h3"
        title={SKILL_USAGE_DETAIL_COPY.outcomeBreakdownHeading}
      />
      <div
        className="mb-2 grid grid-cols-3 gap-3"
        data-testid="SkillDetailUsageOutcomes"
      >
        <SkillUsageStatTile
          label={SKILL_USAGE_DETAIL_COPY.successTile}
          value={skill.successCount}
        />
        <SkillUsageStatTile
          label={SKILL_USAGE_DETAIL_COPY.abandonedTile}
          value={skill.abandonedCount}
        />
        <SkillUsageStatTile
          label={SKILL_USAGE_DETAIL_COPY.errorTile}
          value={skill.errorCount}
        />
      </div>
      <p className="text-muted-foreground mb-8 text-xs">
        {SKILL_USAGE_COPY.outcomesHint}
      </p>

      <GlobalHeading
        className="mb-3"
        heading="h3"
        title={SKILL_USAGE_DETAIL_COPY.overTimeHeading}
      />
      <SkillUsageDailyChart data={usage.byDay} />
    </div>
  );
};
