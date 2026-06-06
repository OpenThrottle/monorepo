import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { Bar, BarChart, XAxis } from 'recharts';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ChartLegend } from '../ChartLegend';
import type { ChartLegendProps } from '../ChartLegend';

describe('ChartLegend Component', () => {
  let component: RenderResult;
  let props: ChartLegendProps;

  beforeEach(() => {
    props = {
      content: <span data-testid="legend-content">content</span>,
    };

    const Component = () => (
      <BarChart data={[{ name: 'a', value: 1 }]}>
        <XAxis dataKey="name" />
        <Bar dataKey="value" />
        <ChartLegend {...props} />
      </BarChart>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
