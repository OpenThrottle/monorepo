import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarProvider } from '../SidebarProvider';
import { SidebarMenuButton } from '../SidebarMenuButton';
import type { SidebarMenuButtonProps } from '../SidebarMenuButton';

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
});
