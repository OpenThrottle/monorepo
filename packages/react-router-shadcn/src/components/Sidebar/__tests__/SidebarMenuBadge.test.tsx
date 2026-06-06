import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarMenuBadge } from '../SidebarMenuBadge';
import type { SidebarMenuBadgeProps } from '../SidebarMenuBadge';
import { Sidebar } from '../Sidebar';
import { SidebarContent } from '../SidebarContent';
import { SidebarGroup } from '../SidebarGroup';
import { SidebarGroupContent } from '../SidebarGroupContent';
import { SidebarMenu } from '../SidebarMenu';
import { SidebarMenuItem } from '../SidebarMenuItem';
import { SidebarProvider } from '../SidebarProvider';

describe('SidebarMenuBadge Component', () => {
  let component: RenderResult;
  let props: SidebarMenuBadgeProps;

  beforeEach(() => {
    props = {};

    const Component = () => (
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuBadge {...props} />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders sidebar-menu-badge slot', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar-menu-badge"]'),
    ).toBeInTheDocument();
  });
});
