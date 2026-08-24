import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueuesTable } from '../QueuesTable';
import type { QueuesTableProps } from '../QueuesTable';
import type { QueueCardFragment } from '~/__generated__/graphql';
import { QUEUES_ROW_ACTIONS_COPY } from '~/routing/queues/data/data.copy';

const mockQueues: QueueCardFragment[] = [
  {
    __typename: 'QueueStatsObject',
    activeCount: 2,
    completedCount: 100,
    delayedCount: 0,
    failedCount: 1,
    name: 'default',
    waitingCount: 5,
  },
  {
    __typename: 'QueueStatsObject',
    activeCount: 0,
    completedCount: 0,
    delayedCount: 0,
    failedCount: 0,
    name: 'notifications',
    waitingCount: 0,
  },
];

describe('QueuesTable Component', () => {
  let component: RenderResult;
  let props: QueuesTableProps;

  beforeEach(() => {
    props = { queues: [] };

    const Component = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render empty state when no queues', () => {
    expect(component.getByTestId('QueuesTable')).toBeInTheDocument();
    expect(component.getByTestId('OpenThrottleEmptyState')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'No queues' }),
    ).toBeInTheDocument();
  });

  test('renders table with column headers when queues provided', () => {
    props = { queues: mockQueues };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const TableComponent = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);
    component.rerender(<RoutesStub />);

    expect(
      component.getByRole('columnheader', { name: /Queue/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Backlog/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /In flight/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Completed/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Failed/i }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: /Actions/i }),
    ).toBeInTheDocument();
  });

  test('renders one row per queue with name link and View in the actions menu', async () => {
    props = { queues: mockQueues };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const TableComponent = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);
    component.rerender(<RoutesStub />);

    const defaultLink = component.getByRole('link', {
      name: 'View queue: default',
    });
    expect(defaultLink).toHaveAttribute('href', '/queues/default');
    const notificationsLink = component.getByRole('link', {
      name: 'View queue: notifications',
    });
    expect(notificationsLink).toHaveAttribute('href', '/queues/notifications');

    const user = userEvent.setup();
    await user.click(
      component.getByRole('button', {
        name: `${QUEUES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} default`,
      }),
    );

    const viewItem = await component.findByRole('menuitem', {
      name: QUEUES_ROW_ACTIONS_COPY.view,
    });
    expect(viewItem).toHaveAttribute('href', '/queues/default');
  });

  test('renders queue counts in table cells', () => {
    props = { queues: mockQueues };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const TableComponent = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);
    component.rerender(<RoutesStub />);

    expect(
      component.getByLabelText('Backlog: 5 total (5 waiting, 0 delayed)'),
    ).toBeInTheDocument();
    expect(component.getByLabelText('2 in flight')).toBeInTheDocument();
    expect(component.getByLabelText('100 completed')).toBeInTheDocument();
    expect(component.getByLabelText('1 failed')).toBeInTheDocument();
  });

  test('exposes accessible labels for zero-count backlog and failed', () => {
    props = { queues: mockQueues };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const TableComponent = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);
    component.rerender(<RoutesStub />);

    expect(
      component.getByLabelText('Backlog: 0 total (0 waiting, 0 delayed)'),
    ).toBeInTheDocument();
    expect(component.getByLabelText('0 in flight')).toBeInTheDocument();
    expect(component.getByLabelText('0 completed')).toBeInTheDocument();
    expect(component.getByLabelText('0 failed')).toBeInTheDocument();
  });

  test('renders a health pill and queue-controls menu per row', async () => {
    props = { queues: mockQueues };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const TableComponent = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);
    component.rerender(<RoutesStub />);

    expect(
      component.getByRole('columnheader', { name: /Health/i }),
    ).toBeInTheDocument();
    expect(component.getByTestId('queue-health-default')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(
      component.getByRole('button', {
        name: `${QUEUES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} default`,
      }),
    );

    expect(
      await component.findByRole('menuitem', {
        name: QUEUES_ROW_ACTIONS_COPY.pauseQueue,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('menuitem', {
        name: QUEUES_ROW_ACTIONS_COPY.resumeQueue,
      }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('menuitem', { name: QUEUES_ROW_ACTIONS_COPY.view }),
    ).toBeInTheDocument();
  });

  test('queue name links and actions trigger receive keyboard focus in row order', async () => {
    props = { queues: mockQueues };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const TableComponent = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);
    component.rerender(<RoutesStub />);

    const user = userEvent.setup();
    const defaultName = component.getByRole('link', {
      name: 'View queue: default',
    });
    const defaultControls = component.getByRole('button', {
      name: `${QUEUES_ROW_ACTIONS_COPY.menuAriaLabelPrefix} default`,
    });

    await user.tab();
    expect(defaultName).toHaveFocus();
    await user.tab();
    expect(defaultControls).toHaveFocus();
  });
});
