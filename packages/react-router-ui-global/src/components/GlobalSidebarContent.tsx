import * as React from 'react';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@openthrottle/react-router-shadcn';
import { NavLink } from 'react-router';
import type { NavLinkProps } from 'react-router';
import { getPathFromTo } from '../utils/utils.global';

export interface GlobalSidebarContentLinkProps extends NavLinkProps {
  icon: React.ComponentType<{ className?: string }>;
}

export interface GlobalSidebarContentProps {
  data?: Record<string, GlobalSidebarContentLinkProps[]>;
}

export const GlobalSidebarContent = (props: GlobalSidebarContentProps) => {
  const { data } = props;

  // Hooks

  // Setup
  const sections = Object.keys(data ?? {});

  // Handlers

  // Markup
  const renderLink = (item: GlobalSidebarContentLinkProps) => {
    const toPath = getPathFromTo(item.to);

    // const isActive =
    //   pathname === toPath || (toPath !== '/' && pathname.startsWith(toPath));

    const Icon = item.icon;

    return (
      <SidebarMenuItem className="m-0" key={toPath} style={{ margin: 0 }}>
        <SidebarMenuButton
          asChild={true}
          isActive={false}
          tooltip={String(item.children)}
        >
          <NavLink
            className="text-muted-foreground"
            // end={true}
            to={item.to}
            viewTransition={true}
          >
            {Icon != null ? <Icon className="size-4 shrink-0" /> : null}
            <span>{item.children?.toString()}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <SidebarContent className="h-full" title="Global Sidebar Content">
        {sections.map((section) => {
          const items = data?.[section] ?? [];

          return (
            <>
              <SidebarGroup key={section} title={section}>
                <SidebarGroupLabel>{section}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu title={section}>
                    {items.map(renderLink)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          );
        })}
        {/* <SidebarGroup className="h-full">
          <SidebarGroupContent className="h-full">
            <SidebarMenu className="h-full flex flex-col gap-4">
              {sections.map((section) => {
                const items = data?.[section] ?? [];

                return (
                  <div key={section}>
                    <h3 className="mb-3 text-sm font-bold text-muted-foreground/80 uppercase">
                      {section}
                    </h3>
                    <div className="bg-muted">{items.map(renderLink)}</div>
                  </div>
                );
              })}
              <div className="flex-1" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> */}
      </SidebarContent>
    </>
  );
};
