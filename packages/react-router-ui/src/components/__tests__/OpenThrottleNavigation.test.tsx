import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleNavigation } from '../OpenThrottleNavigation';
import type { OpenThrottleNavigationProps } from '../OpenThrottleNavigation';

describe('OpenThrottleNavigation Component', () => {
  let component: RenderResult;
  let props: OpenThrottleNavigationProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleNavigation {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders navigation region and heading', () => {
    expect(component.getByTestId('OpenThrottleNavigation')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'OpenThrottle Navigation' }),
    ).toBeInTheDocument();
  });
});
