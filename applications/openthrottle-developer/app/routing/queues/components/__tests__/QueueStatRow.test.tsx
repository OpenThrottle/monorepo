import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { QueueStatRow } from '../QueueStatRow';
import type { QueueStatRowProps } from '../QueueStatRow';

const renderRow = (props: QueueStatRowProps): RenderResult => {
  const Component = () => <QueueStatRow {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('QueueStatRow Component', () => {
  test('renders one stat card per item', () => {
    const component = renderRow({
      stats: [
        { title: 'Backlog', value: 12 },
        { title: 'In flight', value: 3 },
        { title: 'Failed', value: 1 },
      ],
    });

    expect(component.getByTestId('QueueStatRow')).toBeInTheDocument();
    expect(component.getAllByTestId('OpenThrottleStatCard')).toHaveLength(3);
    expect(component.getByText('Backlog')).toBeInTheDocument();
    expect(component.getByText('In flight')).toBeInTheDocument();
  });

  test('renders an empty row without cards', () => {
    const component = renderRow({ stats: [] });

    expect(component.getByTestId('QueueStatRow')).toBeInTheDocument();
    expect(component.queryAllByTestId('OpenThrottleStatCard')).toHaveLength(0);
  });
});
