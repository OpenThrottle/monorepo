import { render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { PLAN_DETAIL_ROUTE_ID } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { usePlanManagedTaskIds } from '../usePlanManagedTaskIds';

interface RuleApplication {
  readonly state: string;
  readonly taskId?: string | null;
}

/**
 * The ledger is a deferred loader key, so the hook reads it through a promise
 * and the managed set starts empty until that promise settles.
 */
interface LoaderData {
  ledger?: Promise<{ readonly ruleApplications: readonly RuleApplication[] }>;
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
    const component = renderWithLoaderData({
      ledger: Promise.resolve({ ruleApplications: [] }),
    });
    expect(await component.findByTestId('ids')).toHaveTextContent('');
  });

  test('is empty while the ledger is still pending', async () => {
    const component = renderWithLoaderData({
      ledger: new Promise(() => {}),
    });

    // No badge rather than a wrong badge: the Tasks tab renders immediately and
    // managed markers appear once the deferred ledger lands.
    expect(await component.findByTestId('ids')).toHaveTextContent('');
  });

  test('includes only tasks with an applied rule application', async () => {
    const component = renderWithLoaderData({
      ledger: Promise.resolve({
        ruleApplications: [
          { state: 'applied', taskId: 'task-1' },
          { state: 'applied', taskId: 'task-2' },
          { state: 'reverted', taskId: 'task-3' },
          { state: 'applied', taskId: null },
        ],
      }),
    });

    const ids = await component.findByTestId('ids');
    await waitFor(() => expect(ids).toHaveTextContent('task-1,task-2'));
  });
});
