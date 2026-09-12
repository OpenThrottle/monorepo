import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { OpenThrottleSidebarProps } from '../OpenThrottleSidebar';
import { OpenThrottleSidebar } from '../OpenThrottleSidebar';

describe('OpenThrottleSidebar Component', () => {
  let component: RenderResult;
  let props: OpenThrottleSidebarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <OpenThrottleSidebar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sidebar region and heading', () => {
    expect(component.getByTestId('OpenThrottleSidebar')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'OpenThrottle Sidebar' }),
    ).toBeInTheDocument();
  });
});
