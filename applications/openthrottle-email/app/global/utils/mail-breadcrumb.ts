import { MAIL_PATHS } from '~/global/data/data.navigation';

/** Current-page breadcrumb for the mail toolbar. */
export interface MailBreadcrumb {
  /** Link target for the current crumb; null renders a non-link BreadcrumbPage. */
  readonly href: string | null;
  /** Label for the current mail area. */
  readonly page: string;
}

/**
 * @description Derive the current-page breadcrumb (label + optional link) from
 * the pathname so Sent, Drafts, Trash, Compose, Search, and Message show the
 * correct crumb. Hoisted out of {@link MailToolbar} per
 * component-primitive-shape R4.
 */
export const getMailBreadcrumb = (pathname: string): MailBreadcrumb => {
  const pathnameNorm = pathname.replace(/\/$/, '') || '/';
  const inboxPathNorm = MAIL_PATHS.inbox.replace(/\/$/, '') || '/';
  if (pathname === MAIL_PATHS.search) {
    return { href: MAIL_PATHS.search, page: 'Search' };
  }
  if (pathnameNorm === MAIL_PATHS.compose) {
    return { href: MAIL_PATHS.compose, page: 'Compose' };
  }
  if (pathnameNorm === MAIL_PATHS.sent) {
    return { href: MAIL_PATHS.sent, page: 'Sent' };
  }
  if (pathnameNorm === MAIL_PATHS.drafts) {
    return { href: MAIL_PATHS.drafts, page: 'Drafts' };
  }
  if (pathnameNorm === MAIL_PATHS.trash) {
    return { href: MAIL_PATHS.trash, page: 'Trash' };
  }
  if (pathnameNorm.startsWith(`${inboxPathNorm}/inbox/`)) {
    return { href: null, page: 'Message' };
  }
  return { href: null, page: 'Inbox' };
};
