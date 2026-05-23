import * as React from 'react';

export interface PlanWorkflowConfigHooksEmptyProps {}

export const PlanWorkflowConfigHooksEmpty = (
  _props: PlanWorkflowConfigHooksEmptyProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      // className={classnames('p-4', className)}
      data-testid="PlanWorkflowConfigHooksEmpty"
    >
      <p className="text-muted-foreground text-sm">
        No hooks configured. The worker runs Ralph only (unchanged from plans
        without hooks).
      </p>
    </div>
  );
};
