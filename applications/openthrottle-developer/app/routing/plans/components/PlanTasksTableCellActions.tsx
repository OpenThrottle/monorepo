import * as React from 'react';
import { Row } from '@tanstack/react-table';
import { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanTaskInlineActions } from '~/routing/plans/components/PlanTaskInlineActions';

export interface PlanTasksTableCellActionsProps {
  readonly row: Row<PlanTaskRowFragment>;
}

export const PlanTasksTableCellActions = (
  props: PlanTasksTableCellActionsProps,
): React.ReactElement => {
  const { row } = props;

  return <PlanTaskInlineActions task={row.original} />;
};
