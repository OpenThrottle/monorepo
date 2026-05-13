import * as React from 'react';
import classnames from 'classnames';
import { Markdown, TabsContent } from '@openthrottle/react-router-shadcn';
import {
  PlanDetailsFragment,
  PlanTaskRowFragment,
} from '@openthrottle/openthrottle-developer-codegen';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';

export interface PlanTabRequirementsProps {
  readonly className?: string;
  readonly plan: PlanDetailsFragment;
  readonly tasks: PlanTaskRowFragment[];
}

export const PlanTabRequirements = (props: PlanTabRequirementsProps) => {
  const { className, plan: _plan, tasks } = props;

  // Hooks

  // Setup
  const requirements = React.useMemo(() => {
    return tasks
      .map((task) => JSON.parse(task.requirementsJson))
      .filter((requirement) => requirement.length > 0);
  }, [tasks]);

  console.log('PlanTabRequirements requirements', requirements);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent
      className="bg-card rounded-lg border border-card-border text-sm text-muted-foreground"
      value="requirements"
    >
      <div className={classnames('p-4', className)}>
        {requirements.length > 0 ? (
          <Markdown
            content={requirements
              .map((requirement) => `- ${requirement}`)
              .join('\n')}
          />
        ) : (
          <OpenThrottleEmptyState
            description="This plan and its tasks have no requirements. Modify the plan and its tasks to add requirements."
            title="No Requirements"
          />
        )}
      </div>
    </TabsContent>
  );
};
