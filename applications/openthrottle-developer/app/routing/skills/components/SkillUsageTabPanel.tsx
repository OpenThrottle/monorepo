import * as React from 'react';
import { Await } from 'react-router';
import { SkillDetailUsage } from '~/routing/skills/components/SkillDetailUsage';
import { SKILL_USAGE_RANGE_DAYS } from '~/routing/skills/config/skill-usage';
import type { SkillDetailUsageData } from '~/routing/skills/data/skill-usage-detail';

export interface SkillUsageTabPanelProps {
  /** Deferred per-skill usage; streamed by the route (RR8 Single Fetch). */
  usage: Promise<SkillDetailUsageData>;
}

/**
 * @description Usage-tab body for /skills/:slug. RR8 streams the loader promise,
 * so the tab shell paints first and the stats hydrate in. The loader already
 * caught failures into the unavailable sentinel, so no errorElement is needed.
 */
export const SkillUsageTabPanel = (
  props: SkillUsageTabPanelProps,
): React.ReactElement => {
  const { usage } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <React.Suspense
      fallback={<p className="text-muted-foreground text-sm">Loading usage…</p>}
    >
      <Await resolve={usage}>
        {(data) => (
          <SkillDetailUsage rangeDays={SKILL_USAGE_RANGE_DAYS} usage={data} />
        )}
      </Await>
    </React.Suspense>
  );
};
