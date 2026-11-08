import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { FEATURE_BETA_PREVIEW } from '@openthrottle/react-router-utils';
import { NotebookTextIcon } from 'lucide-react';
import * as React from 'react';

import type { PlanDetailsFragment } from '~/__generated__/graphql';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { PlanUnscheduleAction } from '~/routing/plans/components/PlanUnscheduleAction';
import type { PlanStatusKey } from '~/routing/plans/types';

export interface PlanDetailRouteHeaderProps {
  readonly plan: PlanDetailsFragment;
  readonly status: PlanStatusKey;
}

/**
 * @description Issue-style heading for the plan detail route: the plan title,
 * then a metadata row (status badge linking to the filtered list, the project
 * the plan points at, author→assignee, created/updated). Navigation breadcrumbs
 * live in the global app header now. Primary run/lifecycle actions stay in the sibling
 * {@link PlanToolbar}. Extracted from {@link PlanDetailRoute} per
 * component-primitive-shape R6. Without beta preview that toolbar is hidden, so
 * a SCHEDULED plan gets its one status control here instead —
 * {@link PlanUnscheduleAction}, beside the badge (D10).
 */
export const PlanDetailRouteHeader = (
  props: PlanDetailRouteHeaderProps,
): React.ReactElement => {
  const { plan, status } = props;

  // Hooks

  // Setup

  // Most plans carry no project, so the chip is conditional rather than an
  // "unassigned" placeholder that would sit on every other plan header.
  const title = plan.title ?? 'Untitled';
  const _project = plan.projectRelation;
  const showUnschedule = !FEATURE_BETA_PREVIEW && status === 'SCHEDULED';

  // Handlers

  // Markup
  const assigneeSuffix = plan.assignee ? ` → ${plan.assignee}` : '';
  const authorLabel = `${plan.author}${assigneeSuffix}`;
  const authorLine = plan.author && (
    <span aria-label={`Author: ${plan.author}`}>{authorLabel}</span>
  );
  const assigneeOnlyLine = !plan.author && plan.assignee && (
    <span aria-label={`Assignee: ${plan.assignee}`}>
      Assignee: {plan.assignee}
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading className="mb-4" icon={NotebookTextIcon} title={title} />

      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <PlanStatusBadge
            scheduledRunAt={plan.scheduledRunAt}
            status={status}
            to={`/plans?status=${status}`}
          />
          {showUnschedule && (
            <PlanUnscheduleAction
              className={undefined}
              planId={plan.id}
              scheduledRunAt={plan.scheduledRunAt}
            />
          )}

          {/* {project ? (
            <Badge
              asChild={true}
              color="sky"
              data-testid="PlanProjectBadge"
              size="xs"
            >
              <Link
                aria-label={`Project: ${project.name}`}
                to={`/projects/${project.id}`}
                viewTransition={true}
              >
                <FolderGit2Icon />
                {project.name}
              </Link>
            </Badge>
          ) : null} */}

          {authorLine}
          {assigneeOnlyLine}
        </div>
      </div>

      {/* <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span>Created {formatPlanDate(plan.createdAt)}</span>
        <span aria-hidden={true}>&bull;</span>
        <span>Updated {formatPlanDate(plan.updatedAt)}</span>
      </div> */}
    </div>
  );
};
