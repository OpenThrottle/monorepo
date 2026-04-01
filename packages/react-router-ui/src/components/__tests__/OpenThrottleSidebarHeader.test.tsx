import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleSidebarHeader } from '../OpenThrottleSidebarHeader';
import type { OpenThrottleSidebarHeaderProps } from '../OpenThrottleSidebarHeader';

describe('OpenThrottleSidebarHeader Component', () => {
  let component: RenderResult;
  let props: OpenThrottleSidebarHeaderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleSidebarHeader {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
