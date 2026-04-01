import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueuesTable } from '../QueuesTable';
import type { QueuesTableProps } from '../QueuesTable';
import type { QueueCardFragment } from '~/__generated__/graphql';

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
    expect(component.getByText('No queues yet.')).toBeInTheDocument();
  });

  test('renders table with column headers when queues provided', () => {
    props = { queues: mockQueues };
    const TableComponent = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);
    component.rerender(<RoutesStub />);

    expect(
      component.getByRole('columnheader', { name: 'Name' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Waiting' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Active' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Completed' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Delayed' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Failed' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('columnheader', { name: 'Actions' }),
    ).toBeInTheDocument();
  });

  test('renders one row per queue with name link and View action', () => {
    props = { queues: mockQueues };
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

    const viewLinks = component.getAllByRole('link', { name: /^View$/ });
    expect(viewLinks).toHaveLength(2);
    expect(viewLinks[0]).toHaveAttribute('href', '/queues/default');
    expect(viewLinks[1]).toHaveAttribute('href', '/queues/notifications');
  });

  test('renders queue counts in table cells', () => {
    props = { queues: mockQueues };
    const TableComponent = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);
    component.rerender(<RoutesStub />);

    expect(component.getByLabelText('5 waiting')).toBeInTheDocument();
    expect(component.getByLabelText('2 active')).toBeInTheDocument();
    expect(component.getByLabelText('100 completed')).toBeInTheDocument();
    expect(component.getByLabelText('1 failed')).toBeInTheDocument();
  });

  test('should render with queues snapshot', () => {
    props = { queues: mockQueues };

    const TableComponent = () => <QueuesTable {...props} />;
    const RoutesStub = createRoutesStub([
      { Component: TableComponent, path: '/' },
    ]);

    component.rerender(<RoutesStub />);
  });
});
