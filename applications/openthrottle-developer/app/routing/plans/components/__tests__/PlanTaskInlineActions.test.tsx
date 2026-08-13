import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTaskInlineActions } from '../PlanTaskInlineActions';
import type { PlanTaskInlineActionsProps } from '../PlanTaskInlineActions';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';

const task = (
  overrides: Partial<PlanTaskRowFragment> = {},
): PlanTaskRowFragment => ({
  __typename: 'TaskObject',
  createdAt: '2026-01-01T00:00:00.000Z',
  id: 'task-1',
  planId: 'plan-1',
  requirementsJson: '[]',
  sortOrder: 1000,
  status: 'PENDING',
  title: 'Ship the feature',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

describe('PlanTaskInlineActions Component', () => {
  let component: RenderResult;
  let props: PlanTaskInlineActionsProps;

  beforeEach(() => {
    props = { task: task() };
  });

  const renderInlineActions = (): RenderResult => {
    const Component = () => <PlanTaskInlineActions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    return render(<RoutesStub />);
  };

  test('renders a View link anchored to the task', () => {
    component = renderInlineActions();

    const link = component.getByRole('link', {
      name: 'View task: Ship the feature',
    });
    expect(link).toHaveAttribute('href', '/#task-task-1');
  });

  test('omits the Details trigger when the task has no description, summary, or requirements', () => {
    component = renderInlineActions();

    expect(component.queryByText('Details')).not.toBeInTheDocument();
  });

  test('shows the Details popover with description, summary, and requirements', async () => {
    props = {
      task: task({
        description: 'A longer description of the work.',
        requirementsJson: JSON.stringify(['Must pass tests', 'Must lint']),
        summary: 'Short summary.',
      }),
    };
    component = renderInlineActions();

    await userEvent.click(
      component.getByRole('button', {
        name: 'View full details for task: Ship the feature',
      }),
    );

    expect(
      component.getByText('A longer description of the work.'),
    ).toBeInTheDocument();
    expect(component.getByText('Short summary.')).toBeInTheDocument();
    expect(component.getByText('Must pass tests')).toBeInTheDocument();
    expect(component.getByText('Must lint')).toBeInTheDocument();
  });
});
