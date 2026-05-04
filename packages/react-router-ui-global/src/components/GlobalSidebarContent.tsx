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
import { NavLink, useLocation } from 'react-router';
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
  const location = useLocation();

  // Setup
  const sections = Object.keys(data ?? {});

  // Handlers

  // Markup
  const renderLink = (item: GlobalSidebarContentLinkProps, index: number) => {
    const { children, icon: IconComponent, to } = item;
    const toPath = getPathFromTo(to);
    const key = `${toPath}-${index}`;
    const isActive = location.pathname.startsWith(toPath);

    console.log({ isActive, pathname: location.pathname, toPath });

    return (
      <SidebarMenuItem className="m-0" key={key} style={{ margin: 0 }}>
        <SidebarMenuButton
          asChild={true}
          isActive={isActive}
          tooltip={String(children)}
        >
          <NavLink
            className="text-muted-foreground"
            to={item.to}
            viewTransition={true}
          >
            <IconComponent className="size-4 shrink-0" />
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
