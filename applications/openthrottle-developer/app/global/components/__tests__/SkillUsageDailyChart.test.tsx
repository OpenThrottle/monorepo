import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { SkillUsageDailyChart } from '../SkillUsageDailyChart';
import type { SkillUsageDailyChartProps } from '../SkillUsageDailyChart';

const renderComponent = (props: SkillUsageDailyChartProps): RenderResult => {
  const Component = (): React.ReactElement => (
    <SkillUsageDailyChart {...props} />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('SkillUsageDailyChart Component', () => {
  test('renders empty-state markup when there is no daily series', () => {
    const component = renderComponent({ data: [] });

    expect(component.getByTestId('SkillUsageDailyChart')).toHaveTextContent(
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
    expect(component.getByTestId('SkillUsageDailyChart')).toBeInTheDocument();
    expect(
      component.queryByText(/No daily skill usage in range/i),
    ).not.toBeInTheDocument();
  });
});
