import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';

export interface PlanTasksEmptyProps {
  // readonly className?: string;
}

export const PlanTasksEmpty = (_props: PlanTasksEmptyProps) => {
  // const { className } = _props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Tasks</h2>
      <Empty>
        <EmptyTitle>No tasks</EmptyTitle>
        <EmptyDescription>This plan has no tasks yet.</EmptyDescription>
      </Empty>
    </div>
  );
};
