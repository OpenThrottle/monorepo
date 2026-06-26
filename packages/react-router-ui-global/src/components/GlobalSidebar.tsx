import * as React from 'react';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@openthrottle/react-router-shadcn';
import { NavLink, useLocation } from 'react-router';
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
  const location = useLocation();
  const activeItemRef = React.useRef<HTMLLIElement | null>(null);

  // Setup
  const sections = Object.keys(data ?? {});

  // Handlers

  // Markup
  const renderLink = (item: GlobalSidebarLinkProps): React.ReactElement => {
    const Icon = item.icon;
    const toPath = getPathFromTo(item.to);
    const isActive = location.pathname === toPath;

    return (
      <SidebarMenuItem key={toPath} ref={isActive ? activeItemRef : undefined}>
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
  // Keep the active link (and its group) in view when the route changes —
  // including direct navigation and back/forward — so items below the fold
  // (e.g. legal links) auto-reveal instead of requiring a manual scroll.
  // block:'nearest' avoids jumping when the item is already visible and
  // scopes the scroll to the nearest scrollable ancestor (SidebarContent).
  React.useEffect(() => {
    const node = activeItemRef.current;

    if (node == null) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    node.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [location.pathname]);

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
