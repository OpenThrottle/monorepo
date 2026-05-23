import * as React from 'react';
import classnames from 'classnames';

export interface PlanWorkflowConfigHookProps {
  className?: string;
}

export const PlanWorkflowConfigHook = (
  props: PlanWorkflowConfigHookProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('p-4', className)}
      data-testid="PlanWorkflowConfigHook"
    >
      <h2>PlanWorkflowConfigHook</h2>
    </div>
  );
};
