import * as React from 'react';
import { GlobalPopover } from '@openthrottle/react-router-ui-global';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { Row } from '@tanstack/react-table';
import { PanelRightIcon, PencilIcon } from 'lucide-react';
import { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PLAN_TASK_ROW_ACTIONS_COPY } from '~/routing/plans/data/data.copy';

export interface PlanTasksTableCellActionsProps {
  row: Row<PlanTaskRowFragment>;
}

/**
 * @description Per-row Actions menu for the plan tasks table, on the shared
 * {@link GlobalPopover} so it reads the same as the plans index and the
 * repositories table. The rich inline Details popover stays on the board cards
 * (`PlanTaskInlineActions`); in the table the task detail route carries that
 * content.
 */
export const PlanTasksTableCellActions = (
  props: PlanTasksTableCellActionsProps,
): React.ReactElement => {
  const { row } = props;

  // Hooks

  // Setup
  const task = row.original;
  const title = task.title ?? 'Untitled';
  const taskPath = `/plans/${task.planId}/tasks/${task.id}`;

  const actions: GlobalPopoverAction[] = [
    {
      icon: <PanelRightIcon aria-hidden={true} className="size-4" />,
      id: 'viewTask',
      kind: 'link',
      label: PLAN_TASK_ROW_ACTIONS_COPY.view,
      to: taskPath,
    },
    {
      icon: <PencilIcon aria-hidden={true} className="size-3.5 shrink-0" />,
      id: 'editTask',
      kind: 'link',
      label: PLAN_TASK_ROW_ACTIONS_COPY.edit,
      to: `${taskPath}/edit`,
    },
  ];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalPopover
      actions={actions}
      ariaLabel={`${PLAN_TASK_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${title}`}
      testId={`PlanTasksTableCellActions-${task.id}`}
    />
  );
};
