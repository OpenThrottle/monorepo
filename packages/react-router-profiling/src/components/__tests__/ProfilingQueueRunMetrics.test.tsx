import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProfilingQueueRunMetrics } from '../ProfilingQueueRunMetrics';
import type { ProfilingQueueRunMetricsProps } from '../ProfilingQueueRunMetrics';

describe('ProfilingQueueRunMetrics Component', () => {
  let component: RenderResult;
  let props: ProfilingQueueRunMetricsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ProfilingQueueRunMetrics {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(
      component.getByTestId('ProfilingQueueRunMetrics'),
    ).toBeInTheDocument();
  });
});
