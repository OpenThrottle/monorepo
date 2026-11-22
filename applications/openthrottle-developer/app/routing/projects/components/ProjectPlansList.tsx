import { cn } from '@openthrottle/react-router-shadcn';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type { ProjectPlanRowFragment } from '~/__generated__/graphql';
import { ProjectPlanRow } from '~/routing/projects/components/ProjectPlanRow';
import { PROJECT_PLANS_COPY } from '~/routing/projects/data/data.copy';

export interface ProjectPlansListProps {
  readonly className?: string;
  /** Position of the first row in the project's full order (the page offset). */
  readonly offset: number;
  /** One page of the project's plans, in project order. */
  readonly plans: readonly ProjectPlanRowFragment[];
  /** Live plans in the project across every page. */
  readonly totalCount: number;
}

/**
 * @description One page of the project's plans in project order, each row with
 * its absolute position, status, task progress, a link to the plan (its PR lives
 * on the plan's runs, so the plan page is the PR entry point), a GlobalPopover
 * with Move up / Move down / Remove, and an inline expand for the plan's tasks
 * (see {@link ProjectPlanRow}). A move posts only the plan
 * and a direction (`moveProjectPlan`); the server swaps it with its neighbour in
 * the full order, so the first row of a page can move onto the previous page.
 */
export const ProjectPlansList = (
  props: ProjectPlansListProps,
): React.ReactElement => {
  const { className, offset, plans, totalCount } = props;

  // Hooks

  // Setup

  // Handlers
  const buildActions = (
    plan: ProjectPlanRowFragment,
    index: number,
  ): GlobalPopoverAction[] => {
    const position = offset + index;
    const moveFields = (direction: 'DOWN' | 'UP'): Record<string, string> => {
      return { direction, intent: 'moveProjectPlan', planId: plan.id };
    };

    return [
      {
        id: `open-${plan.id}`,
        kind: 'link',
        label: PROJECT_PLANS_COPY.openPlan,
        to: `/plans/${plan.id}`,
      },
      {
        disabled: position === 0,
        fields: moveFields('UP'),
        id: `up-${plan.id}`,
        kind: 'submit',
        label: PROJECT_PLANS_COPY.moveUp,
        navigate: false,
        separatorBefore: true,
      },
      {
        disabled: position === totalCount - 1,
        fields: moveFields('DOWN'),
        id: `down-${plan.id}`,
        kind: 'submit',
        label: PROJECT_PLANS_COPY.moveDown,
        navigate: false,
      },
      {
        destructive: true,
        fields: { intent: 'removePlanFromProject', planId: plan.id },
        id: `remove-${plan.id}`,
        kind: 'submit',
        label: PROJECT_PLANS_COPY.remove,
        navigate: false,
        separatorBefore: true,
      },
    ];
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (plans.length === 0) {
    return (
      <p
        className="text-muted-foreground text-sm"
        data-testid="ProjectPlansList"
      >
        {PROJECT_PLANS_COPY.empty}
      </p>
    );
  }

  return (
    <ol
      className={cn('ui-border divide-y rounded-lg border', className)}
      data-testid="ProjectPlansList"
    >
      {plans.map((plan, index) => (
        <ProjectPlanRow
          actions={buildActions(plan, index)}
          key={plan.id}
          plan={plan}
          position={offset + index + 1}
        />
      ))}
    </ol>
  );
};
