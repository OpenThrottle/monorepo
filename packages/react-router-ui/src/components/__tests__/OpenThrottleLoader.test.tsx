import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { OpenThrottleLoaderProps } from '../OpenThrottleLoader';
import { OpenThrottleLoader } from '../OpenThrottleLoader';

describe('OpenThrottleLoader Component', () => {
  let component: RenderResult;
  let props: OpenThrottleLoaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleLoader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders loader region and heading', () => {
    expect(component.getByTestId('OpenThrottleLoader')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'OpenThrottle Loader' }),
    ).toBeInTheDocument();
  });
});
