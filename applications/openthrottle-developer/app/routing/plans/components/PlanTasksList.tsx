import * as React from 'react';
import { PlanTasksListItem } from '~/routing/plans/components/PlanTasksListItem';

export interface PlanTasksListProps {}

export const PlanTasksList = (_props: PlanTasksListProps) => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="bg-card rounded-lg border border-card-border"
      data-testid="PlanTasksList"
    >
      <PlanTasksListItem />
      <PlanTasksListItem />
      <PlanTasksListItem />
      <PlanTasksListItem />
      <PlanTasksListItem />
    </div>
  );
};
