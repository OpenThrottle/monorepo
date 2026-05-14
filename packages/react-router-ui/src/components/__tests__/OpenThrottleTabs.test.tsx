import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleTabs } from '../OpenThrottleTabs';
import type { OpenThrottleTabsProps } from '../OpenThrottleTabs';

describe('OpenThrottleTabs Component', () => {
  let component: RenderResult;
  let props: OpenThrottleTabsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleTabs {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
