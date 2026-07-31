import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import QueuesIndex from '../queues._index';

describe('routes/queues._index.tsx', () => {
  test('renders queues introduction, summary stats and table', async () => {
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
    expect(component.getByTestId('QueueStatRow')).toBeInTheDocument();
    expect(component.getByTestId('QueuesTable')).toBeInTheDocument();
    expect(component.getByTestId('QueueOpsToolbar')).toBeInTheDocument();
  });
});
