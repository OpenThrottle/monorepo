import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProfilingTaskRunMetrics } from '../ProfilingTaskRunMetrics';
import type { ProfilingTaskRunMetricsProps } from '../ProfilingTaskRunMetrics';

describe('ProfilingTaskRunMetrics Component', () => {
  let component: RenderResult;
  let props: ProfilingTaskRunMetricsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ProfilingTaskRunMetrics {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(
      component.getByTestId('ProfilingTaskRunMetrics'),
    ).toBeInTheDocument();
  });
});
