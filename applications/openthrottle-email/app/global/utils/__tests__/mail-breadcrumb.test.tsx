import { describe, expect, test } from 'vitest';
import { getMailBreadcrumb } from '../mail-breadcrumb';

describe('getMailBreadcrumb', () => {
  test('returns Search for the search page', () => {
    expect(getMailBreadcrumb('/mail/search')).toEqual({
      href: '/mail/search',
      page: 'Search',
    });
  });

  test('returns Compose for the compose page', () => {
    expect(getMailBreadcrumb('/mail/compose')).toEqual({
      href: '/mail/compose',
      page: 'Compose',
    });
  });

  test('returns Sent, Drafts, and Trash for their respective pages', () => {
    expect(getMailBreadcrumb('/mail/sent')).toEqual({
      href: '/mail/sent',
      page: 'Sent',
    });
    expect(getMailBreadcrumb('/mail/drafts')).toEqual({
      href: '/mail/drafts',
      page: 'Drafts',
    });
    expect(getMailBreadcrumb('/mail/trash')).toEqual({
      href: '/mail/trash',
      page: 'Trash',
    });
  });

  test('returns Message with no link for an individual message page', () => {
    expect(getMailBreadcrumb('/mail/inbox/123')).toEqual({
      href: null,
      page: 'Message',
    });
  });

  test('falls back to Inbox for the inbox root', () => {
    expect(getMailBreadcrumb('/mail/')).toEqual({ href: null, page: 'Inbox' });
    expect(getMailBreadcrumb('/mail')).toEqual({ href: null, page: 'Inbox' });
  });
});
