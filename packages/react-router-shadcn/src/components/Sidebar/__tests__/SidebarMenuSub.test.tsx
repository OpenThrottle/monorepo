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
import { SidebarMenuItem } from '../SidebarMenuItem';
import type { SidebarMenuSubProps } from '../SidebarMenuSub';
import { SidebarMenuSub } from '../SidebarMenuSub';
import { SidebarProvider } from '../SidebarProvider';

describe('SidebarMenuSub Component', () => {
  let component: RenderResult;
  let props: SidebarMenuSubProps;

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
                    <SidebarMenuSub {...props} />
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

  test('renders sidebar-menu-sub slot', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar-menu-sub"]'),
    ).toBeInTheDocument();
  });
});
