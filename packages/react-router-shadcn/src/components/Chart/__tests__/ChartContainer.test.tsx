import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { Bar, BarChart, XAxis } from 'recharts';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ChartContainer } from '../ChartContainer';
import type { ChartContainerProps } from '../ChartContainer';

describe('ChartContainer Component', () => {
  let component: RenderResult;
  let props: ChartContainerProps;

  beforeEach(() => {
    props = {
      children: (
        <BarChart data={[{ name: 'a', value: 1 }]}>
          <XAxis dataKey="name" />
          <Bar dataKey="value" />
        </BarChart>
      ),
      config: {
        value: { color: '#000000', label: 'Value' },
      },
    };

    const Component = () => <ChartContainer {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders chart container', () => {
    expect(
      component.container.querySelector('.recharts-responsive-container'),
    ).toBeInTheDocument();
  });
});
