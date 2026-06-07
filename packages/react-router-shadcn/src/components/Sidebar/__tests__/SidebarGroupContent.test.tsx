import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SidebarGroupContent } from '../SidebarGroupContent';
import type { SidebarGroupContentProps } from '../SidebarGroupContent';
import { Sidebar } from '../Sidebar';
import { SidebarContent } from '../SidebarContent';
import { SidebarGroup } from '../SidebarGroup';
import { SidebarMenu } from '../SidebarMenu';
import { SidebarMenuItem } from '../SidebarMenuItem';
import { SidebarProvider } from '../SidebarProvider';

describe('SidebarGroupContent Component', () => {
  let component: RenderResult;
  let props: SidebarGroupContentProps;

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
                    <SidebarGroupContent {...props} />
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

  test('renders sidebar-group-content slot', () => {
    expect(
      component.container.querySelector('[data-slot="sidebar-group-content"]'),
    ).toBeInTheDocument();
  });
});
