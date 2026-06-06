import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ChartConfigContext } from '../../chart-config-context';
import { ChartLegendContent } from '../ChartLegendContent';
import type { ChartLegendContentProps } from '../ChartLegendContent';

describe('ChartLegendContent Component', () => {
  let component: RenderResult;
  let props: ChartLegendContentProps;

  beforeEach(() => {
    props = {
      payload: [{ color: '#222222', dataKey: 'sales', value: 'sales' }],
    };

    const Component = () => (
      <ChartConfigContext.Provider
        value={{
          sales: { color: '#111111', label: 'Sales' },
        }}
      >
        <ChartLegendContent {...props} />
      </ChartConfigContext.Provider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
