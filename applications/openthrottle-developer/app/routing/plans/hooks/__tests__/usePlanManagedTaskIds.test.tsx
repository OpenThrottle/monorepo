import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PLAN_DETAIL_ROUTE_ID } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { usePlanManagedTaskIds } from '../usePlanManagedTaskIds';

interface LoaderData {
  ruleApplications?: readonly {
    readonly state: string;
    readonly taskId?: string | null;
  }[];
}

function Harness(): React.ReactElement {
  const managed = usePlanManagedTaskIds();
  return <div data-testid="ids">{Array.from(managed).sort().join(',')}</div>;
}

const renderWithLoaderData = (loaderData: LoaderData) => {
  const RoutesStub = createRoutesStub([
    {
      Component: Harness,
      id: PLAN_DETAIL_ROUTE_ID,
      loader: () => loaderData,
      path: '/',
    },
  ]);
  return render(<RoutesStub />);
};

describe('usePlanManagedTaskIds', () => {
  test('is empty when the route has no rule applications', async () => {
    const component = renderWithLoaderData({ ruleApplications: [] });
    expect(await component.findByTestId('ids')).toHaveTextContent('');
  });

  test('is empty when ruleApplications is absent from loader data', async () => {
    const component = renderWithLoaderData({});
    expect(await component.findByTestId('ids')).toHaveTextContent('');
  });

  test('includes only tasks with an applied rule application', async () => {
    const component = renderWithLoaderData({
      ruleApplications: [
        { state: 'applied', taskId: 'task-1' },
        { state: 'applied', taskId: 'task-2' },
        { state: 'reverted', taskId: 'task-3' },
        { state: 'applied', taskId: null },
      ],
    });

    expect(await component.findByTestId('ids')).toHaveTextContent(
      'task-1,task-2',
    );
  });
});
