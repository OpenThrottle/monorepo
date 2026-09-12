import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { Sidebar } from '../Sidebar';
import { SidebarContent } from '../SidebarContent';
import { SidebarGroup } from '../SidebarGroup';
import { SidebarGroupContent } from '../SidebarGroupContent';
import { SidebarMenu } from '../SidebarMenu';
import type { SidebarMenuItemProps } from '../SidebarMenuItem';
import { SidebarMenuItem } from '../SidebarMenuItem';
import { SidebarProvider } from '../SidebarProvider';

describe('SidebarMenuItem Component', () => {
  let component: RenderResult;
  let props: SidebarMenuItemProps;

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
                    <SidebarMenuItem {...props} />
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

  test('renders sidebar-menu-item slot', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar-menu-item"]'),
    ).toBeInTheDocument();
  });
});
