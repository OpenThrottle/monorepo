import * as React from 'react';
import classnames from 'classnames';
import { TabsContent } from '@openthrottle/react-router-shadcn';

export interface PlanTabRequirementsProps {
  readonly className?: string;
}

export const PlanTabRequirements = (props: PlanTabRequirementsProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent
      className="bg-card rounded-lg border border-card-border"
      value="requirements"
    >
      <div
        className={classnames('p-4', className)}
        data-testid="PlanTabRequirements"
      >
        <h2>PlanTabRequirements</h2>
      </div>
    </TabsContent>
  );
};
