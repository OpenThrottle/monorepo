import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ChartConfigContext } from '../../chart-config-context';
import { ChartTooltipContent } from '../ChartTooltipContent';
import type { ChartTooltipContentProps } from '../ChartTooltipContent';

describe('ChartTooltipContent Component', () => {
  let component: RenderResult;
  let props: ChartTooltipContentProps;

  beforeEach(() => {
    props = {
      active: true,
      label: 'Q1',
      payload: [
        {
          dataKey: 'sales',
          name: 'sales',
          payload: { name: 'Region A' },
          value: 12.34,
        },
      ],
    };

    const Component = () => (
      <ChartConfigContext.Provider
        value={{
          sales: { color: '#111111', label: 'Sales' },
        }}
      >
        <ChartTooltipContent {...props} />
      </ChartConfigContext.Provider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
