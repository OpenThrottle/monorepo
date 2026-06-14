import * as React from 'react';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@openthrottle/react-router-shadcn';
import { NavLink } from 'react-router';
import type { NavLinkProps } from 'react-router';
import { getPathFromTo } from '../utils/utils.global';

export interface GlobalSidebarLinkProps extends NavLinkProps {
  icon: React.ComponentType<{ className?: string }>;
}

export interface GlobalSidebarProps {
  data?: Record<string, GlobalSidebarLinkProps[]>;
}

export const GlobalSidebar = (
  props: GlobalSidebarProps,
): React.ReactElement => {
  const { data } = props;

  // Hooks

  // Setup
  const sections = Object.keys(data ?? {});

  // Handlers

  // Markup
  const renderLink = (item: GlobalSidebarLinkProps): React.ReactElement => {
    const Icon = item.icon;
    const toPath = getPathFromTo(item.to);

    return (
      <SidebarMenuItem key={toPath}>
        <SidebarMenuButton tooltip={String(item.children)}>
          <NavLink
            className="text-muted-foreground"
            end={true}
            to={item.to}
            viewTransition={true}
          >
            <Icon className="size-4 shrink-0" />
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SidebarContent className="h-full">
      {sections.map((section) => {
        const items = data?.[section] ?? [];

        return (
          <SidebarGroup key={section}>
            <SidebarGroupContent>
              <SidebarMenu className="flex h-full flex-col gap-4">
                <div className="bg-muted">{items.map(renderLink)}</div>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </SidebarContent>
  );
};
