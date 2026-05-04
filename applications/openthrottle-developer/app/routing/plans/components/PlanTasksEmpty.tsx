import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';

export interface PlanTasksEmptyProps {}

export const PlanTasksEmpty = (_props: PlanTasksEmptyProps) => {
  // const { className } = _props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty>
      <EmptyTitle>No tasks</EmptyTitle>
      <EmptyDescription>This plan has no tasks yet.</EmptyDescription>
    </Empty>
  );
};
