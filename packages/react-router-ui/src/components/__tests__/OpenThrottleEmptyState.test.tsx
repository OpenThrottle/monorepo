import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleEmptyState } from '../OpenThrottleEmptyState';
import type { OpenThrottleEmptyStateProps } from '../OpenThrottleEmptyState';

describe('OpenThrottleEmptyState Component', () => {
  let component: RenderResult;
  let props: OpenThrottleEmptyStateProps;

  beforeEach(() => {
    props = { description: '', title: '' };

    const Component = () => <OpenThrottleEmptyState {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
