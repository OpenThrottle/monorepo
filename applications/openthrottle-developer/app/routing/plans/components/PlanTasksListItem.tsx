import * as React from 'react';
import classnames from 'classnames';

export interface PlanTasksListItemProps {
  readonly className?: string;
}

export const PlanTasksListItem = (props: PlanTasksListItemProps) => {
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
      data-testid="PlanTasksListItem"
    >
      <h2>PlanTasksListItem</h2>
    </div>
  );
};
