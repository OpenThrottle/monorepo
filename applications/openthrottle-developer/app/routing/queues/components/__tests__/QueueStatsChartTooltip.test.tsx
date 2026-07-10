import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueueStatsChartTooltip } from '../QueueStatsChartTooltip';
import type { ChartTooltipContentProps } from '@openthrottle/react-router-shadcn';

const chartRowPayload = {
  active: 2,
  completed: 48_200,
  delayed: 0,
  failed: 14,
  name: 'plans',
  waiting: 0,
};

describe('QueueStatsChartTooltip', () => {
  let component: RenderResult;
  let props: ChartTooltipContentProps;

  beforeEach(() => {
    props = {
      active: true,
      label: 'plans',
      payload: [
        {
          dataKey: 'waiting',
          name: 'waiting',
          payload: chartRowPayload,
          value: 0,
        },
      ],
    };

    const Component = () => <QueueStatsChartTooltip {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render null when tooltip is inactive', () => {
    props = { ...props, active: false };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <QueueStatsChartTooltip {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(component.container.firstChild).toBeNull();
  });

  test('should render null when payload is empty', () => {
    props = { ...props, payload: [] };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <QueueStatsChartTooltip {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(component.container.firstChild).toBeNull();
  });

  test('should render null when chart row payload is missing series fields', () => {
    props = {
      ...props,
      payload: [
        {
          dataKey: 'waiting',
          name: 'waiting',
          payload: { name: 'plans' },
          value: 0,
        },
      ],
    };
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => <QueueStatsChartTooltip {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component.rerender(<RoutesStub />);

    expect(component.container.firstChild).toBeNull();
  });

  test('should list all five table field labels with counts', () => {
    expect(component.getByText('plans')).toBeInTheDocument();
    expect(component.getByText('Waiting')).toBeInTheDocument();
    expect(component.getByText('Delayed')).toBeInTheDocument();
    expect(component.getByText('In flight')).toBeInTheDocument();
    expect(component.getByText('Completed')).toBeInTheDocument();
    expect(component.getByText('Failed')).toBeInTheDocument();
    expect(component.getByText('48200')).toBeInTheDocument();
    expect(component.getByText('14')).toBeInTheDocument();
  });

  test('should show completed count when operational bars hide completed series', () => {
    expect(component.getByText('Completed')).toBeInTheDocument();
    expect(component.getByText('48200')).toBeInTheDocument();
  });
});
