import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleTabLink } from '../OpenThrottleTabLink';
import type { OpenThrottleTabLinkProps } from '../OpenThrottleTabLink';

describe('OpenThrottleTabLink Component', () => {
  let component: RenderResult;
  let props: OpenThrottleTabLinkProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleTabLink {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders tab link region and heading', () => {
    expect(component.getByTestId('OpenThrottleTabLink')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'OpenThrottleTabLink' }),
    ).toBeInTheDocument();
  });
});
