import { getClearAuthCookieHeader } from '@openthrottle/react-router-auth';
import { redirect } from 'react-router';

import { CmsSignoutDocument } from '~/__generated__/graphql';
import { fetchAuthGraphql } from '~/global/utils/graphql.server';

/**
 * @description Signs out: tells the server, then clears the CMS auth cookie and goes home. The
 * cookie is cleared even when the server call fails (an expired token, the API down), so leaving
 * always works.
 */
export const signOut = async (request: Request): Promise<Response> => {
  try {
    await fetchAuthGraphql(request, CmsSignoutDocument);
  } catch (error) {
    console.error('🔴 cms sign-out failed', error);
  }

  return redirect('/', {
    headers: { 'Set-Cookie': getClearAuthCookieHeader() },
  });
};
