import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleGetStarted } from '../OpenThrottleGetStarted';
import type { OpenThrottleGetStartedProps } from '../OpenThrottleGetStarted';

describe('OpenThrottleGetStarted Component', () => {
  let component: RenderResult;
  let props: OpenThrottleGetStartedProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleGetStarted {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
