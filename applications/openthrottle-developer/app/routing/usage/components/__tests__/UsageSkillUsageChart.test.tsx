import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { UsageSkillUsageChart } from '../UsageSkillUsageChart';
import type { UsageSkillUsageChartProps } from '../UsageSkillUsageChart';

const renderComponent = (props: UsageSkillUsageChartProps): RenderResult => {
  const Component = (): React.ReactElement => (
    <UsageSkillUsageChart {...props} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('UsageSkillUsageChart Component', () => {
  test('renders empty-state markup when there is no daily series', () => {
    const component = renderComponent({ data: [] });

    expect(component.getByTestId('UsageSkillUsageChart')).toHaveTextContent(
      /No daily skill usage in range/i,
    );
  });

  test('mounts the chart wrapper when data is present (no Recharts ticks)', () => {
    const component = renderComponent({
      data: [
        {
          date: '2026-07-15',
          oursCount: 2,
          thirdPartyCount: 1,
          totalCount: 3,
        },
      ],
    });

    // jsdom draws no Recharts geometry — assert the wrapper mounts only.
    expect(component.getByTestId('UsageSkillUsageChart')).toBeInTheDocument();
    expect(
      component.queryByText(/No daily skill usage in range/i),
    ).not.toBeInTheDocument();
  });
});
