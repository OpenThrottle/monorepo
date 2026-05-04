import * as React from 'react';
import classnames from 'classnames';
import { NavLink, useLocation } from 'react-router';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@openthrottle/react-router-shadcn';
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

    // console.log('asdfasdfasdf', item.end === true);

    const isExact = item.end === true;
    const isActive = isExact
      ? location.pathname === toPath
      : location.pathname.startsWith(toPath);

    return (
      <SidebarMenuItem className="m-0" key={key} style={{ margin: 0 }}>
        <SidebarMenuButton
          asChild={true}
          color="#00ff00"
          isActive={isActive}
          tooltip={String(children)}
        >
          <NavLink
            className="text-xs!"
            color="#00ff00"
            to={item.to}
            viewTransition={true}
          >
            <IconComponent
              className={classnames('size-4 shrink-0', {
                'text-accent': isActive,
                'text-muted-foreground': !isActive,
              })}
            />
            <span className={classnames('', { 'text-accent': isActive })}>
              {item.children?.toString()}
            </span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <SidebarContent className="h-full" title="Global Sidebar Content">
      {sections.map((section) => {
        const items = data?.[section] ?? [];

        return (
          <SidebarGroup key={section} title={section}>
            <SidebarGroupLabel>{section}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu title={section}>{items.map(renderLink)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </SidebarContent>
  );
};
