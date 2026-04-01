import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { OpenThrottleSidebar } from '../OpenThrottleSidebar';
import type { OpenThrottleSidebarProps } from '../OpenThrottleSidebar';

describe('OpenThrottleSidebar Component', () => {
  let component: RenderResult;
  let props: OpenThrottleSidebarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleSidebar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
