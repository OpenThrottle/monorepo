import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { ProjectPlanCandidateFragment } from '~/__generated__/graphql';
import { PROJECT_PLANS_COPY } from '~/routing/projects/data/copy';

import { ProjectPlanAdd } from '../ProjectPlanAdd';

const plans: ProjectPlanCandidateFragment[] = [
  {
    __typename: 'PlanObject',
    id: 'plan-1',
    projectId: null,
    projectRelation: null,
    status: 'PENDING',
    title: 'Alpha',
  },
  {
    __typename: 'PlanObject',
    id: 'plan-2',
    projectId: 'proj-2',
    projectRelation: {
      __typename: 'ProjectObject',
      id: 'proj-2',
      name: 'Beacon',
    },
    status: 'COMPLETED',
    title: 'Beta',
  },
];

const renderAdd = (actionResult: Record<string, unknown> = {}) => {
  const submitted: { intent: unknown; planIds: unknown[] }[] = [];
  const Component = () => {
    return (
      <ProjectPlanAdd plans={plans} project={{ id: 'proj-1', name: 'Atlas' }} />
    );
  };
  const RoutesStub = createRoutesStub([
    {
      Component,
      action: async ({ request }: { request: Request }) => {
        const formData = await request.formData();
        submitted.push({
          intent: formData.get('intent'),
          planIds: formData.getAll('planId'),
        });
        return actionResult;
      },
      path: '/',
    },
  ]);

  return { component: render(<RoutesStub />), submitted };
};

describe('ProjectPlanAdd Component', () => {
  test('disables Add until a plan is picked', () => {
    const { component } = renderAdd();

    expect(
      component.getByRole('button', { name: PROJECT_PLANS_COPY.addButton }),
    ).toBeDisabled();
  });

  test('marks a plan that would move from another project', async () => {
    const user = userEvent.setup();
    const { component } = renderAdd();

    await user.click(
      component.getByRole('button', {
        name: PROJECT_PLANS_COPY.addPlaceholder,
      }),
    );

    expect(
      await component.findByText(
        `Completed · ${PROJECT_PLANS_COPY.inOtherProjectPrefix} Beacon`,
      ),
    ).toBeInTheDocument();
    expect(component.getByText('Pending')).toBeInTheDocument();
  });

  test('adds every picked plan in one submit, in the order picked', async () => {
    const user = userEvent.setup();
    const { component, submitted } = renderAdd();

    await user.click(
      component.getByRole('button', {
        name: PROJECT_PLANS_COPY.addPlaceholder,
      }),
    );
    await user.click(await component.findByText('Beta'));
    await user.click(component.getByText('Alpha'));
    await user.keyboard('{Escape}');
    await user.click(
      component.getByRole('button', {
        name: `${PROJECT_PLANS_COPY.addButtonCountPrefix} 2 ${PROJECT_PLANS_COPY.addButtonCountSuffix}`,
      }),
    );

    await waitFor(() => {
      expect(submitted).toEqual([
        { intent: 'addPlanToProject', planIds: ['plan-2', 'plan-1'] },
      ]);
    });
  });

  test('shows the action error', async () => {
    const user = userEvent.setup();
    const error = `${PROJECT_PLANS_COPY.addFailedPrefix} 1 of 1 plans.`;
    const { component } = renderAdd({ projectError: error });

    await user.click(
      component.getByRole('button', {
        name: PROJECT_PLANS_COPY.addPlaceholder,
      }),
    );
    await user.click(await component.findByText('Alpha'));
    await user.keyboard('{Escape}');
    await user.click(
      component.getByRole('button', { name: PROJECT_PLANS_COPY.addButton }),
    );

    expect(await component.findByRole('alert')).toHaveTextContent(error);
  });

  test('offers the new-plan prompt for this project', () => {
    const { component } = renderAdd();

    expect(
      component.getByRole('button', { name: PROJECT_PLANS_COPY.newPlanCopy }),
    ).toBeInTheDocument();
  });
});
