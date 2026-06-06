import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleLogo } from '../OpenThrottleLogo';
import type { OpenThrottleLogoProps } from '../OpenThrottleLogo';

describe('OpenThrottleLogo Component', () => {
  let component: RenderResult;
  let props: OpenThrottleLogoProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleLogo {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders OpenThrottle brand text', () => {
    expect(component.getByTestId('OpenThrottleLogo')).toBeInTheDocument();
    expect(component.getByText('OpenThrottle')).toBeInTheDocument();
  });
});
