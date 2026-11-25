import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type {
  PlanProjectOptionFragment,
  ProjectDetailsFragment,
} from '~/__generated__/graphql';
import { PLAN_PROJECT_COPY } from '~/routing/plans/data/copy';
import { PLAN_DETAIL_ROUTE_ID } from '~/routing/plans/data/plan-detail-route-id';
import { buildPlanDetailLoaderData } from '~/routing/plans/testing/plan-detail-route-data';

import type { PlanProjectControlProps } from '../PlanProjectControl';
import { PlanProjectControl } from '../PlanProjectControl';

const options: PlanProjectOptionFragment[] = [
  { __typename: 'ProjectObject', id: 'project-1', name: 'Atlas' },
  { __typename: 'ProjectObject', id: 'project-2', name: 'Beacon' },
];

const atlas: ProjectDetailsFragment = {
  __typename: 'ProjectObject',
  id: 'project-1',
  name: 'Atlas',
};

const renderControl = (props: PlanProjectControlProps) => {
  const submitted: FormData[] = [];
  const loaderData = buildPlanDetailLoaderData({
    projects: Promise.resolve(options),
  });
  const action = vi.fn(async ({ request }: { request: Request }) => {
    submitted.push(await request.formData());
    return { planProjectUpdated: true };
  });
  const Component = () => {
    return <PlanProjectControl {...props} />;
  };
  const RoutesStub = createRoutesStub([
    {
      Component,
      action,
      id: PLAN_DETAIL_ROUTE_ID,
      loader: () => loaderData,
      path: '/',
    },
  ]);
  const component = render(
    <RoutesStub
      hydrationData={{ loaderData: { [PLAN_DETAIL_ROUTE_ID]: loaderData } }}
    />,
  );

  return { component, submitted };
};

describe('PlanProjectControl Component', () => {
  describe('when the plan has no project', () => {
    test('shows no badge and assigns the picked project', async () => {
      const user = userEvent.setup();
      const { component, submitted } = renderControl({
        project: null,
      });

      expect(component.queryByTestId('PlanProjectBadge')).toBeNull();

      await user.click(
        component.getByRole('combobox', { name: PLAN_PROJECT_COPY.add }),
      );
      await user.click(await component.findByText('Beacon'));

      await waitFor(() => {
        expect(submitted).toHaveLength(1);
      });
      expect(submitted[0]?.get('intent')).toBe('assignPlanProject');
      expect(submitted[0]?.get('projectId')).toBe('project-2');
    });
  });

  describe('when the plan has a project', () => {
    test('links the badge and offers only the other projects to move to', async () => {
      const user = userEvent.setup();
      const { component } = renderControl({
        project: atlas,
      });

      expect(component.getByTestId('PlanProjectBadge')).toHaveAttribute(
        'href',
        '/projects/project-1',
      );

      await user.click(
        component.getByRole('combobox', { name: PLAN_PROJECT_COPY.change }),
      );

      expect(await component.findByText('Beacon')).toBeInTheDocument();
      expect(component.getAllByText('Atlas')).toHaveLength(1);
    });

    test('removes the plan from its project', async () => {
      const user = userEvent.setup();
      const { component, submitted } = renderControl({
        project: atlas,
      });

      await user.click(
        component.getByRole('button', { name: PLAN_PROJECT_COPY.remove }),
      );

      await waitFor(() => {
        expect(submitted).toHaveLength(1);
      });
      expect(submitted[0]?.get('intent')).toBe('removePlanProject');
    });
  });
});
