import { GlobalLayoutBreadcrumbs } from '@openthrottle/react-router-ui-global';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { handle as planHandle } from '../plans.$planId._index';
import { handle as taskHandle } from '../plans.$planId.tasks.$taskId._index';

const PLAN_ID = 'fb96d4e4-04ca-4a6e-9f0b-3d5b6f5a1c11';
const TASK_ID = 'c48d6624-c2df-4c1e-8a25-0f2f4f8b9a22';

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}/;

describe('plan and task breadcrumbs', () => {
  test('plan detail shows the plan title, not the UUID', async () => {
    const RoutesStub = createRoutesStub([
      {
        Component: GlobalLayoutBreadcrumbs,
        handle: planHandle,
        loader: () => ({ plan: { id: PLAN_ID, title: 'Fix mobile header' } }),
        path: '/plans/:planId',
      },
    ]);
    render(<RoutesStub initialEntries={[`/plans/${PLAN_ID}`]} />);

    const nav = await screen.findByTestId('OpenThrottleBreadcrumbs');

    expect(nav).toHaveTextContent('Plans');
    expect(nav).toHaveTextContent('Fix mobile header');
    expect(nav.textContent).not.toMatch(UUID_PATTERN);
  });

  test('task detail shows plan and task titles, not UUIDs', async () => {
    const RoutesStub = createRoutesStub([
      {
        Component: GlobalLayoutBreadcrumbs,
        handle: taskHandle,
        loader: () => ({
          plan: { id: PLAN_ID, title: 'Fix mobile header' },
          task: { id: TASK_ID, title: 'Collapse trailing links' },
        }),
        path: '/plans/:planId/tasks/:taskId',
      },
    ]);
    render(
      <RoutesStub initialEntries={[`/plans/${PLAN_ID}/tasks/${TASK_ID}`]} />,
    );

    const nav = await screen.findByTestId('OpenThrottleBreadcrumbs');

    expect(nav).toHaveTextContent('Plans');
    expect(nav).toHaveTextContent('Fix mobile header');
    expect(nav).toHaveTextContent('Collapse trailing links');
    expect(nav.textContent).not.toMatch(UUID_PATTERN);
    expect(
      screen.getByRole('link', { name: 'Fix mobile header' }),
    ).toHaveAttribute('href', `/plans/${PLAN_ID}`);
  });
});
