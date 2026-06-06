import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarContent } from '../SidebarContent';
import type { SidebarContentProps } from '../SidebarContent';
import { Sidebar } from '../Sidebar';
import { SidebarGroup } from '../SidebarGroup';
import { SidebarGroupContent } from '../SidebarGroupContent';
import { SidebarMenu } from '../SidebarMenu';
import { SidebarMenuItem } from '../SidebarMenuItem';
import { SidebarProvider } from '../SidebarProvider';

describe('SidebarContent Component', () => {
  let component: RenderResult;
  let props: SidebarContentProps;

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
                    <SidebarContent {...props} />
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

  test('renders sidebar-content slot', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar-content"]'),
    ).toBeInTheDocument();
  });
});
