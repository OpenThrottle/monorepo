import { Table, TableBody } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import type { AgentTrajectoryPlanGroupItemRowFragment } from '~/__generated__/graphql';
import {
  MOCK_PLAN_GROUP_PLAN_ITEM,
  MOCK_PLAN_GROUP_TASK_ITEM,
} from '~/routing/evals/data/mock.trajectory-plan-groups';
import { renderEvals } from '~/routing/evals/testing/renderEvals';

import { TrajectoryPlanGroupRow } from '../TrajectoryPlanGroupRow';

const renderRow = (item: AgentTrajectoryPlanGroupItemRowFragment) => {
  return renderEvals(
    <Table>
      <TableBody>
        <TrajectoryPlanGroupRow item={item} />
      </TableBody>
    </Table>,
  );
};

describe('TrajectoryPlanGroupRow Component', () => {
  describe('for a task-scoped trajectory', () => {
    test('links the task title to the viewer and shows your verdict', () => {
      const component = renderRow(MOCK_PLAN_GROUP_TASK_ITEM);

      expect(
        component.getByRole('link', { name: 'Alpha task one' }),
      ).toHaveAttribute('href', '/evals/trajectories/trajectory-task-1');
      expect(
        component.container.querySelector('[data-verdict="pass"]'),
      ).not.toBeNull();
    });
  });

  describe('for a plan-scoped, unscored trajectory', () => {
    test('links to the viewer and marks it unscored', () => {
      const component = renderRow(MOCK_PLAN_GROUP_PLAN_ITEM);

      expect(component.getByRole('link')).toHaveAttribute(
        'href',
        '/evals/trajectories/trajectory-plan-1',
      );
      expect(
        component.container.querySelector('[data-verdict="unscored"]'),
      ).not.toBeNull();
    });
  });
});
