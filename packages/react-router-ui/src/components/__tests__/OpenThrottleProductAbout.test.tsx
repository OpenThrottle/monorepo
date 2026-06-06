import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleProductAbout } from '../OpenThrottleProductAbout';
import type { OpenThrottleProductAboutProps } from '../OpenThrottleProductAbout';

describe('OpenThrottleProductAbout Component', () => {
  let component: RenderResult;
  let props: OpenThrottleProductAboutProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleProductAbout {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders about region and heading', () => {
    expect(
      component.getByTestId('OpenThrottleProductAbout'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'OpenThrottleProductAbout' }),
    ).toBeInTheDocument();
  });
});
