import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { Bar, BarChart, XAxis } from 'recharts';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ChartTooltip } from '../ChartTooltip';
import type { ChartTooltipProps } from '../ChartTooltip';

describe('ChartTooltip Component', () => {
  let component: RenderResult;
  let props: ChartTooltipProps;

  beforeEach(() => {
    props = {
      content: <span data-testid="tooltip-content">content</span>,
    };

    const Component = () => (
      <BarChart data={[{ name: 'a', value: 1 }]}>
        <XAxis dataKey="name" />
        <Bar dataKey="value" />
        <ChartTooltip {...props} />
      </BarChart>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
