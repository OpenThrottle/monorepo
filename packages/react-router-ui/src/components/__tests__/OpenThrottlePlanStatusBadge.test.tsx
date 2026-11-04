import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { OpenThrottlePlanStatusBadgeProps } from '../OpenThrottlePlanStatusBadge';
import { OpenThrottlePlanStatusBadge } from '../OpenThrottlePlanStatusBadge';

describe('OpenThrottlePlanStatusBadge Component', () => {
  let component: RenderResult;
  let props: OpenThrottlePlanStatusBadgeProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottlePlanStatusBadge {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders plan status badge region and heading', () => {
    expect(
      component.getByTestId('OpenThrottlePlanStatusBadge'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', {
        name: 'OpenThrottle Plan Status Badge',
      }),
    ).toBeInTheDocument();
  });
});
