import * as React from 'react';
import classnames from 'classnames';
import { TabsContent } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { PlanDetailsFragment } from '@openthrottle/openthrottle-developer-codegen';
import { formatPlanDate } from '~/routing/plans/utils/formatters';

export interface PlanTabsMetadataProps {
  className?: string;
  plan: PlanDetailsFragment;
}

export const PlanTabsMetadata = (
  props: PlanTabsMetadataProps,
): React.ReactElement => {
  const { className, plan } = props;
  const { projectRelation: project } = plan;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent
      className="bg-card rounded-lg border border-card-border"
      value="metadata"
    >
      <div
        className={classnames('p-4 md:p-8', className)}
        data-testid="PlanTabsMetadata"
      >
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Author</dt>
            <dd>{plan.author}</dd>
          </div>

          {plan.assignee != null && plan.assignee !== '' && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">Assignee</dt>
              <dd>{plan.assignee}</dd>
            </div>
          )}

          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Category</dt>
            <dd>{plan.category}</dd>
          </div>

          {project != null && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">Project</dt>
              <dd>
                <Link
                  className="hover:text-foreground underline"
                  to={`/projects/${project.id}`}
                >
                  {project.name}
                </Link>
              </dd>
            </div>
          )}

          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatPlanDate(plan.createdAt)}</dd>
          </div>

          <div className="flex flex-wrap gap-x-2">
            <dt className="text-muted-foreground">Updated</dt>
            <dd>{formatPlanDate(plan.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </TabsContent>
  );
};
