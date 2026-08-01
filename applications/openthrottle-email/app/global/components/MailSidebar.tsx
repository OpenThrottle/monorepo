import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router';
import { OpenThrottleSidebarHeader } from '@openthrottle/react-router-ui';
import { getMockUnreadCountByFolder } from '~/global/data/mock.mail';
import { MAIL_PATHS, mailNavigation } from '~/global/data/data.navigation';
import {
  getNavIcon,
  getPath,
  normalizePath,
  pathToFolderId,
} from '~/global/utils/mail-navigation';
import type { MailFolderId } from '~/types/mail';

export interface MailSidebarProps {
  readonly className?: string;
  /**
   * Optional unread count per folder for sidebar badges. When omitted, mock counts are used for UI.
   * Unread counts and user folders to be wired to API.
   */
  readonly folderUnreadCounts?: Partial<Record<MailFolderId, number>>;
}

export const MailSidebar = (props: MailSidebarProps): React.ReactElement => {
  const { className, folderUnreadCounts } = props;

  // Hooks
  const location = useLocation();

  // Setup
  // Use prop or mock for folder badges (wire to API when backend is ready).
  const unreadCounts = React.useMemo(
    () => folderUnreadCounts ?? getMockUnreadCountByFolder(),
    [folderUnreadCounts],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Sidebar
      className={clsx(className)}
      collapsible="icon"
      data-testid="MailSidebar"
    >
      <OpenThrottleSidebarHeader name="Email" to={MAIL_PATHS.inbox} />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mailNavigation.map((item) => {
                const path = getPath(item.to);
                const locNorm = normalizePath(location.pathname);
                const pathNorm = normalizePath(path);
                const isActive =
                  locNorm === pathNorm ||
                  (pathNorm !== '/' &&
                    pathNorm !== normalizePath(MAIL_PATHS.inbox) &&
                    location.pathname.startsWith(path)) ||
                  (pathNorm === normalizePath(MAIL_PATHS.inbox) &&
                    (locNorm === '/mail' || locNorm === '/'));
                const folderId = pathToFolderId(path);
                const unreadCount =
                  folderId != null ? (unreadCounts[folderId] ?? 0) : 0;
                const IconComponent = getNavIcon(path);

                return (
                  <SidebarMenuItem key={String(item.to)}>
                    <SidebarMenuButton
                      asChild={true}
                      isActive={isActive}
                      tooltip={String(item.children)}
                    >
                      <NavLink to={item.to} viewTransition={true}>
                        {IconComponent != null ? (
                          <IconComponent className="size-4 shrink-0" />
                        ) : null}
                        <span>{item.children}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {unreadCount > 0 ? (
                      <SidebarMenuBadge
                        data-testid={`MailSidebar-badge-${folderId ?? 'folder'}`}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Future: second group "Folders" with user-created folders; add/edit/delete via DropdownMenu on folder item. Wire to API. */}
        <SidebarGroup>
          <SidebarGroupLabel>Folders</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <span className="text-muted-foreground px-2 py-1.5 text-sm">
                  No custom folders
                </span>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
};
