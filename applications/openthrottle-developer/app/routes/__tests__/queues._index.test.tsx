import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import QueuesIndex from '../queues._index';

describe('routes/queues._index.tsx', () => {
  test('renders queues introduction, collapsed summary stats and table', async () => {
    const RoutesStub = createRoutesStub([
      {
        Component: QueuesIndex,
        HydrateFallback: () => null,
        id: 'routes/queues._index',
        loader: () => ({ queues: [] }),
        path: '/',
      },
    ]);

    const component = render(<RoutesStub />);

    expect(
      await component.findByRole('heading', { level: 1, name: 'Queues' }),
    ).toBeInTheDocument();
    // Summary stats are collapsed until ?stats=open.
    expect(component.queryByTestId('QueueStatRow')).not.toBeInTheDocument();
    expect(component.getByTestId('GlobalStatsToggleButton')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(component.getByTestId('QueuesTable')).toBeInTheDocument();
    expect(component.getByTestId('QueueOpsToolbar')).toBeInTheDocument();
  });

  test('opens the summary stats from ?stats=open', async () => {
    const RoutesStub = createRoutesStub([
      {
        Component: QueuesIndex,
        HydrateFallback: () => null,
        id: 'routes/queues._index',
        loader: () => ({ queues: [] }),
        path: '/',
      },
    ]);

    const component = render(<RoutesStub initialEntries={['/?stats=open']} />);

    expect(await component.findByTestId('QueueStatRow')).toBeInTheDocument();
  });
});
