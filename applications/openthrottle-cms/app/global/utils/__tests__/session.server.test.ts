import { describe, expect, test } from 'vitest';
import { commitSession, destroySession, getSession } from '../session.server';

describe('session.server', () => {
  test('creates and commits a cookie session', async () => {
    const session = await getSession();
    session.set('userId', 'user-123');

    const cookie = await commitSession(session);

    expect(cookie).toContain('openthrottle-cms_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
  });

  test('destroys an existing cookie session', async () => {
    const session = await getSession();
    session.set('userId', 'user-123');

    const destroyedCookie = await destroySession(session);

    expect(destroyedCookie).toContain('openthrottle-cms_session=');
    expect(destroyedCookie).toContain('Expires=Thu, 01 Jan 1970');
  });
});
