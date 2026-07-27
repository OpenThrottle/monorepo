import * as React from 'react';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Lock } from 'lucide-react';
import { MANAGED_TASK_BADGE_COPY } from '~/routing/plans/data/data.copy';

export interface PlanManagedTaskBadgeProps {
  className?: string;
}

/**
 * @description Badge marking a task as rule-managed (tag→action injected, e.g.
 * GitHub Commit). Its placement is a server-reconciled invariant, so the tooltip
 * explains that a manual reorder snaps back. Render only when a task is managed;
 * see {@link usePlanManagedTaskIds}.
 */
export const PlanManagedTaskBadge = (
  props: PlanManagedTaskBadgeProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <Badge
          aria-label={MANAGED_TASK_BADGE_COPY.label}
          className={className}
          color="amber"
          data-testid="PlanManagedTaskBadge"
          size="xs"
          variant="outline"
        >
          <Lock aria-hidden={true} className="size-3" />
          {MANAGED_TASK_BADGE_COPY.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{MANAGED_TASK_BADGE_COPY.tooltip}</TooltipContent>
    </Tooltip>
  );
};
