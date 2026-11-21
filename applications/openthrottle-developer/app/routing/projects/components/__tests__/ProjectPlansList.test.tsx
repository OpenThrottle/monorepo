import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { PROJECT_PLANS_COPY } from '~/routing/projects/data/data.copy';

import type { ProjectPlansListProps } from '../ProjectPlansList';
import { ProjectPlansList } from '../ProjectPlansList';

const plan = (
  id: string,
  title: string,
  status: string,
): ProjectPlansListProps['plans'][number] => {
  return {
    __typename: 'PlanObject',
    id,
    projectSortOrder: 1000,
    status,
    taskCount: 4,
    tasksCompletedCount: 1,
    title,
  };
};

describe('ProjectPlansList Component', () => {
  let component: RenderResult;
  let props: ProjectPlansListProps;
  let submitted: Record<string, FormDataEntryValue | null>[];

  const renderList = (): void => {
    const Component = () => {
      return <ProjectPlansList {...props} />;
    };
    const RoutesStub = createRoutesStub([
      {
        Component,
        action: async ({ request }: { request: Request }) => {
          const formData = await request.formData();
          submitted.push({
            direction: formData.get('direction'),
            intent: formData.get('intent'),
            planId: formData.get('planId'),
          });
          return {};
        },
        path: '/',
      },
    ]);
    component = render(<RoutesStub />);
  };

  beforeEach(() => {
    submitted = [];
    props = {
      offset: 0,
      plans: [
        plan('plan-a', 'First plan', 'COMPLETED'),
        plan('plan-b', 'Second plan', 'PENDING'),
      ],
      totalCount: 2,
    };
  });

  describe('with plans', () => {
    beforeEach(() => {
      renderList();
    });

    test('lists plans in order, each linking to its plan page', () => {
      const items = component.getAllByRole('listitem');
      expect(items).toHaveLength(2);
      expect(
        component.getByRole('link', { name: 'First plan' }),
      ).toHaveAttribute('href', '/plans/plan-a');
      expect(
        component.getByRole('link', { name: 'Second plan' }),
      ).toHaveAttribute('href', '/plans/plan-b');
    });

    test('Move up submits the plan and direction', async () => {
      const user = userEvent.setup();
      await user.click(
        component.getByRole('button', {
          name: `${PROJECT_PLANS_COPY.menuAriaLabelPrefix} Second plan`,
        }),
      );
      await user.click(
        await component.findByRole('menuitem', {
          name: PROJECT_PLANS_COPY.moveUp,
        }),
      );
      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toMatchObject({
        direction: 'UP',
        intent: 'moveProjectPlan',
        planId: 'plan-b',
      });
    });

    test('Remove from project submits the plan id', async () => {
      const user = userEvent.setup();
      await user.click(
        component.getByRole('button', {
          name: `${PROJECT_PLANS_COPY.menuAriaLabelPrefix} First plan`,
        }),
      );
      await user.click(
        await component.findByRole('menuitem', {
          name: PROJECT_PLANS_COPY.remove,
        }),
      );
      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toMatchObject({
        intent: 'removePlanFromProject',
        planId: 'plan-a',
      });
    });
  });

  describe('on a later page', () => {
    beforeEach(() => {
      props = { ...props, offset: 50, totalCount: 52 };
      renderList();
    });

    test('numbers rows by their position in the whole project', () => {
      const items = component.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('51');
      expect(items[1]).toHaveTextContent('52');
    });

    test('lets the first row of the page move up onto the previous page', async () => {
      const user = userEvent.setup();
      await user.click(
        component.getByRole('button', {
          name: `${PROJECT_PLANS_COPY.menuAriaLabelPrefix} First plan`,
        }),
      );
      const moveUp = await component.findByRole('menuitem', {
        name: PROJECT_PLANS_COPY.moveUp,
      });
      expect(moveUp).not.toHaveAttribute('aria-disabled', 'true');
      await user.click(moveUp);
      await waitFor(() => expect(submitted).toHaveLength(1));
      expect(submitted[0]).toMatchObject({
        direction: 'UP',
        intent: 'moveProjectPlan',
        planId: 'plan-a',
      });
    });
  });

  describe('without plans', () => {
    test('renders the empty state and no list', () => {
      props = { offset: 0, plans: [], totalCount: 0 };
      renderList();
      expect(component.queryByRole('list')).not.toBeInTheDocument();
      expect(component.getByTestId('ProjectPlansList')).toBeInTheDocument();
    });
  });
});
