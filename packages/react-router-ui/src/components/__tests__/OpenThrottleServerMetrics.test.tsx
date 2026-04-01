import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleServerMetrics } from '../OpenThrottleServerMetrics';
import type { OpenThrottleServerMetricsProps } from '../OpenThrottleServerMetrics';

describe('OpenThrottleServerMetrics Component', () => {
  let component: RenderResult;
  let props: OpenThrottleServerMetricsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleServerMetrics {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
