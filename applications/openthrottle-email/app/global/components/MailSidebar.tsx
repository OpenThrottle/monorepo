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
import classnames from 'classnames';
import type { LinkProps } from 'react-router';
import { NavLink, useLocation } from 'react-router';
import { TrayIcon } from '@phosphor-icons/react/dist/ssr/Tray';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { PencilSimpleLineIcon } from '@phosphor-icons/react/dist/ssr/PencilSimpleLine';
import { GearIcon } from '@phosphor-icons/react/dist/ssr/Gear';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { FileDashedIcon } from '@phosphor-icons/react/dist/ssr/FileDashed';
import { OpenThrottleSidebarHeader } from '@openthrottle/react-router-ui';
import { getMockUnreadCountByFolder } from '~/global/data/mock.mail';
import { MAIL_PATHS, mailNavigation } from '~/global/data/data.navigation';
import type { MailFolderId } from '~/types/mail';
import { MAIL_FOLDER_IDS } from '~/types/mail';

function getNavIcon(
  path: string,
): React.ComponentType<{ className?: string }> | undefined {
  const norm = normalizePath(path);
  if (norm === normalizePath(MAIL_PATHS.inbox)) return TrayIcon;
  if (norm === MAIL_PATHS.sent) return PaperPlaneTiltIcon;
  if (norm === MAIL_PATHS.drafts) return FileDashedIcon;
  if (norm === MAIL_PATHS.trash) return TrashIcon;
  if (norm === MAIL_PATHS.search) return MagnifyingGlassIcon;
  if (norm === MAIL_PATHS.compose) return PencilSimpleLineIcon;
  if (norm === '/settings') return GearIcon;
  return undefined;
}

export interface MailSidebarProps {
  readonly className?: string;
  /**
   * Optional unread count per folder for sidebar badges. When omitted, mock counts are used for UI.
   * Unread counts and user folders to be wired to API.
   */
  readonly folderUnreadCounts?: Partial<Record<MailFolderId, number>>;
}

function getPath(to: LinkProps['to']): string {
  return typeof to === 'string' ? to : (to.pathname ?? '/');
}

/** Normalize path for comparison (strip trailing slash so /mail and /mail/ match). */
function normalizePath(p: string): string {
  const s = p.replace(/\/$/, '') || '/';
  return s === '' ? '/' : s;
}

/** Maps sidebar nav path to folder id for badge display; returns null for non-folder links (Compose, Settings). */
function pathToFolderId(path: string): MailFolderId | null {
  const normalized = normalizePath(path);
  if (normalized === normalizePath(MAIL_PATHS.inbox)) {
    return MAIL_FOLDER_IDS.inbox;
  }
  if (normalized === MAIL_PATHS.sent) return MAIL_FOLDER_IDS.sent;
  if (normalized === MAIL_PATHS.drafts) return MAIL_FOLDER_IDS.drafts;
  if (normalized === MAIL_PATHS.trash) return MAIL_FOLDER_IDS.trash;
  return null;
}

export const MailSidebar = (props: MailSidebarProps): React.ReactElement => {
  const { className, folderUnreadCounts } = props;

  // Hooks
  const location = useLocation();

  // Setup — use prop or mock for folder badges (wire to API when backend is ready)
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
      className={classnames(className)}
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
                <span className="px-2 py-1.5 text-sm text-muted-foreground">
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
