import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { QueueJobMetrics } from '../QueueJobMetrics';
import type { QueueJobMetricsProps } from '../QueueJobMetrics';

describe('QueueJobMetrics Component', () => {
  let component: RenderResult;
  let props: QueueJobMetricsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <QueueJobMetrics {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
