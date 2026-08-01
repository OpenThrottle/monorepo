import type * as React from 'react';
import type { LinkProps } from 'react-router';
import { FileDashedIcon } from '@phosphor-icons/react/dist/ssr/FileDashed';
import { GearIcon } from '@phosphor-icons/react/dist/ssr/Gear';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { PaperPlaneTiltIcon } from '@phosphor-icons/react/dist/ssr/PaperPlaneTilt';
import { PencilSimpleLineIcon } from '@phosphor-icons/react/dist/ssr/PencilSimpleLine';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { TrayIcon } from '@phosphor-icons/react/dist/ssr/Tray';
import { MAIL_PATHS } from '~/global/data/data.navigation';
import type { MailFolderId } from '~/types/mail';
import { MAIL_FOLDER_IDS } from '~/types/mail';

/**
 * @description Pure helpers for mail navigation (path normalization, nav icons,
 * folder mapping). Hoisted out of {@link MailSidebar} per
 * component-primitive-shape R4 so they are discoverable and independently
 * testable.
 */

/** Normalize path for comparison (strip trailing slash so /mail and /mail/ match). */
export const normalizePath = (p: string): string => {
  const s = p.replace(/\/$/, '') || '/';
  return s === '' ? '/' : s;
};

/** Extract the pathname from a Link `to` prop (string or partial location). */
export const getPath = (to: LinkProps['to']): string =>
  typeof to === 'string' ? to : (to.pathname ?? '/');

/** Resolve the sidebar icon component for a mail nav path; undefined when the path has no icon. */
export const getNavIcon = (
  path: string,
): React.ComponentType<{ className?: string }> | undefined => {
  const norm = normalizePath(path);
  if (norm === normalizePath(MAIL_PATHS.inbox)) return TrayIcon;
  if (norm === MAIL_PATHS.sent) return PaperPlaneTiltIcon;
  if (norm === MAIL_PATHS.drafts) return FileDashedIcon;
  if (norm === MAIL_PATHS.trash) return TrashIcon;
  if (norm === MAIL_PATHS.search) return MagnifyingGlassIcon;
  if (norm === MAIL_PATHS.compose) return PencilSimpleLineIcon;
  if (norm === '/settings') return GearIcon;
  return undefined;
};

/** Maps sidebar nav path to folder id for badge display; returns null for non-folder links (Compose, Settings). */
export const pathToFolderId = (path: string): MailFolderId | null => {
  const normalized = normalizePath(path);
  if (normalized === normalizePath(MAIL_PATHS.inbox)) {
    return MAIL_FOLDER_IDS.inbox;
  }
  if (normalized === MAIL_PATHS.sent) return MAIL_FOLDER_IDS.sent;
  if (normalized === MAIL_PATHS.drafts) return MAIL_FOLDER_IDS.drafts;
  if (normalized === MAIL_PATHS.trash) return MAIL_FOLDER_IDS.trash;
  return null;
};
