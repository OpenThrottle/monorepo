import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  MOCK_PLAN_GROUP,
  MOCK_UNKNOWN_PLAN_GROUP,
} from '~/routing/evals/data/mock.trajectory-plan-groups';
import { renderEvals } from '~/routing/evals/testing/renderEvals';

import { TrajectoryPlanGroup } from '../TrajectoryPlanGroup';

describe('TrajectoryPlanGroup Component', () => {
  describe('for a live plan', () => {
    test('anchors the group, links the plan and lists its rows', () => {
      const component = renderEvals(
        <TrajectoryPlanGroup actions={null} group={MOCK_PLAN_GROUP} />,
      );
      const group = component.getByTestId('TrajectoryPlanGroup');

      expect(group).toHaveAttribute('id', 'plan-group-plan-1');
      expect(
        component.getByRole('link', { name: 'Seed plan Alpha' }),
      ).toHaveAttribute('href', '/plans/plan-1');
      expect(component.getAllByTestId('TrajectoryPlanGroupRow')).toHaveLength(
        2,
      );
      expect(component.getByRole('progressbar')).toBeInTheDocument();
    });

    test('collapses and expands its rows', async () => {
      const user = userEvent.setup();
      const component = renderEvals(
        <TrajectoryPlanGroup actions={null} group={MOCK_PLAN_GROUP} />,
      );
      const toggle = component.getByRole('button');

      await user.click(toggle);
      expect(component.queryAllByTestId('TrajectoryPlanGroupRow')).toHaveLength(
        0,
      );

      await user.click(toggle);
      expect(component.getAllByTestId('TrajectoryPlanGroupRow')).toHaveLength(
        2,
      );
    });

    test('renders the actions it is given', () => {
      const component = renderEvals(
        <TrajectoryPlanGroup
          actions={<button type="button">act</button>}
          group={MOCK_PLAN_GROUP}
        />,
      );

      expect(
        component.getByRole('button', { name: 'act' }),
      ).toBeInTheDocument();
    });
  });

  describe('for the deleted-plan group', () => {
    test('anchors as unknown and links no plan', () => {
      const component = renderEvals(
        <TrajectoryPlanGroup actions={null} group={MOCK_UNKNOWN_PLAN_GROUP} />,
      );

      expect(component.getByTestId('TrajectoryPlanGroup')).toHaveAttribute(
        'id',
        'plan-group-unknown',
      );
      const planLinks = component.getAllByRole('link').filter((link) => {
        return link.getAttribute('href')?.startsWith('/plans/') === true;
      });

      expect(planLinks).toHaveLength(0);
    });
  });
});
