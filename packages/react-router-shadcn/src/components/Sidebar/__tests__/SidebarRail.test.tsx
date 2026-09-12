import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { SidebarProvider } from '../SidebarProvider';
import type { SidebarRailProps } from '../SidebarRail';
import { SidebarRail } from '../SidebarRail';

describe('SidebarRail Component', () => {
  let component: RenderResult;
  let props: SidebarRailProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <SidebarProvider>
        <SidebarRail {...props} />
      </SidebarProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sidebar rail control', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar-rail"]'),
    ).toBeInTheDocument();
  });
});
