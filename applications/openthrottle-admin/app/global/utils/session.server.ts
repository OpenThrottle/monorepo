import { createCookieSessionStorage } from 'react-router';
import { IS_PRODUCTION } from '@openthrottle/react-router-utils';

const COOKIE_SECRET = process.env.COOKIE_SECRET ?? 'default_secret';

/**
 * @description lifted directly from the remix documentation
 * @link https://remix.run/docs/en/v1/api/remix#sessions
 */
export const sessionStorage = createCookieSessionStorage({
  // a Cookie from `createCookie` or the CookieOptions to create one
  cookie: {
    domain: IS_PRODUCTION ? 'admin.openthrottle.ai' : 'localhost', // FIXME: change this to the domain of the app
    expires: new Date(Date.now() + 60 * 60 * 24 * 7),
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    name: 'openthrottle-admin_session',
    path: '/',
    sameSite: 'lax',
    secrets: [COOKIE_SECRET],
    secure: IS_PRODUCTION,
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
