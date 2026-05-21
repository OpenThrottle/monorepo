import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { HomeGetStarted } from '../HomeGetStarted';
import type { HomeGetStartedProps } from '../HomeGetStarted';

describe('HomeGetStarted Component', () => {
  let component: RenderResult;
  let props: HomeGetStartedProps;

  beforeEach(() => {
    props = {};

    const Component = () => <HomeGetStarted {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
