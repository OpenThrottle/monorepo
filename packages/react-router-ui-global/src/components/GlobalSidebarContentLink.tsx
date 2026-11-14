import {
  cn,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@openthrottle/react-router-shadcn';
import { StarIcon } from 'lucide-react';
import * as React from 'react';
import { NavLink } from 'react-router';

import { findActiveSubLink, isSidebarLinkActive } from '../utils/sidebar-links';
import { getPathFromTo } from '../utils/utils.global';
import type { GlobalSidebarContentLinkProps as LinkProps } from './GlobalSidebarContent';

export interface GlobalSidebarContentLinkProps {
  readonly activeItemRef: React.RefObject<HTMLLIElement | null>;
  readonly isBetaEnabled: boolean;
  readonly isCharlieEnabled: boolean;
  readonly item: LinkProps;
  readonly onNavigate: () => void;
  readonly pathname: string;
}

export const GlobalSidebarContentLink = (
  props: GlobalSidebarContentLinkProps,
): React.ReactElement | null => {
  const { activeItemRef, isBetaEnabled, isCharlieEnabled, item, onNavigate } =
    props;
  const { pathname } = props;

  // Hooks

  // Setup
  const { children, icon: IconComponent } = item;
  const isActive = isSidebarLinkActive(item, pathname);
  const activeSubLink = isActive
    ? findActiveSubLink(item, pathname)
    : undefined;
  const visibleSubLinks = (item.subLinks ?? []).filter((subLink) => {
    return subLink.beta !== true || isBetaEnabled;
  });
  const showSubLinks = isActive && visibleSubLinks.length > 0;

  // Handlers

  // Markup
  const renderSubLink = (subLink: LinkProps, index: number) => {
    const isSubActive = subLink === activeSubLink;

    return (
      <SidebarMenuSubItem
        key={`${getPathFromTo(subLink.to)}-${index}`}
        ref={isSubActive ? activeItemRef : undefined}
      >
        <SidebarMenuSubButton asChild={true} isActive={isSubActive}>
          <NavLink
            className={cn('text-xs! [&.pending]:animate-pulse', {
              'text-muted-foreground pointer-events-none':
                subLink.disabled && !isCharlieEnabled,
            })}
            end={subLink.end}
            onClick={onNavigate}
            prefetch={subLink.prefetch}
            to={subLink.to}
            viewTransition={true}
          >
            <span className={cn('', { 'text-accent': isSubActive })}>
              {subLink.children?.toString()}
            </span>
            {subLink.beta && (
              <StarIcon
                className="text-muted-foreground ml-auto size-3"
                fill={isSubActive ? 'currentColor' : 'none'}
              />
            )}
          </NavLink>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit
  if (item.beta && !isBetaEnabled) {
    return null;
  }

  return (
    <SidebarMenuItem
      className="m-0"
      ref={isActive && activeSubLink === undefined ? activeItemRef : undefined}
      style={{ margin: 0 }}
    >
      <SidebarMenuButton
        asChild={true}
        isActive={isActive}
        tooltip={String(children)}
      >
        <NavLink
          className={cn('text-xs! [&.pending]:animate-pulse', {
            'text-muted-foreground pointer-events-none':
              item.disabled && !isCharlieEnabled,
          })}
          onClick={onNavigate}
          prefetch={item.prefetch}
          to={item.to}
          viewTransition={true}
        >
          <IconComponent
            className={cn('size-4 shrink-0', {
              'text-accent': isActive,
              'text-muted-foreground': !isActive,
            })}
          />
          <span className={cn('', { 'text-accent': isActive })}>
            {item.children?.toString()}
          </span>
          {item.beta && (
            <span className="text-muted-foreground flex w-full flex-1 items-center justify-end text-right">
              <StarIcon
                className={cn('size-3', {
                  'text-accent': isActive,
                  'text-muted-foreground': !isActive,
                })}
                fill={isActive ? 'currentColor' : 'none'}
              />
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
      {showSubLinks && (
        <SidebarMenuSub className="mt-1 mr-0 pr-0">
          {visibleSubLinks.map(renderSubLink)}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
};
