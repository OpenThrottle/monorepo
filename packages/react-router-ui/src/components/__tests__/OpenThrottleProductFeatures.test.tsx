import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleProductFeatures } from '../OpenThrottleProductFeatures';
import type { OpenThrottleProductFeaturesProps } from '../OpenThrottleProductFeatures';

describe('OpenThrottleProductFeatures Component', () => {
  let component: RenderResult;
  let props: OpenThrottleProductFeaturesProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleProductFeatures {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
