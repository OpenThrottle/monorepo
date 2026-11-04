import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { SidebarMenuButtonProps } from '../SidebarMenuButton';
import { SidebarMenuButton } from '../SidebarMenuButton';
import { SidebarProvider } from '../SidebarProvider';

describe('SidebarMenuButton Component', () => {
  let component: RenderResult;
  let props: SidebarMenuButtonProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <SidebarProvider>
        <SidebarMenuButton {...props} />
      </SidebarProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sidebar menu button slot', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar-menu-button"]'),
    ).toBeInTheDocument();
  });

  test('keeps the 32px desktop height and grows to 44px on coarse pointers', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar-menu-button"]'),
    ).toHaveClass('h-8', 'pointer-coarse:h-11');
  });
});
