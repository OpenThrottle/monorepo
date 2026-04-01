import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleServerHealthBanner } from '../OpenThrottleServerHealthBanner';
import type { OpenThrottleServerHealthBannerProps } from '../OpenThrottleServerHealthBanner';

describe('OpenThrottleServerHealthBanner Component', () => {
  let component: RenderResult;
  let props: OpenThrottleServerHealthBannerProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleServerHealthBanner {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
