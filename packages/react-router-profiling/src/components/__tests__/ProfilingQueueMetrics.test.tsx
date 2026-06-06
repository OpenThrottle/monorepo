import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ProfilingQueueMetrics } from '../ProfilingQueueMetrics';
import type { ProfilingQueueMetricsProps } from '../ProfilingQueueMetrics';

describe('ProfilingQueueMetrics Component', () => {
  let component: RenderResult;
  let props: ProfilingQueueMetricsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ProfilingQueueMetrics {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('ProfilingQueueMetrics')).toBeInTheDocument();
  });
});
