import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { getClearAuthCookieHeader } from '@openthrottle/react-router-auth';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SignoutDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/auth.logout';

/**
 * @link https://reactrouter.com/start/framework/route-module#loader
 * @description Real signout: calls the signout mutation, clears the auth cookie,
 * and redirects to the index route. Visiting /auth/logout always logs the user out.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  try {
    await executeGraphqlWithAuth(request, SignoutDocument);
  } catch (error) {
    console.error('🔴 signout - auth.logout loader', error);
    // Still clear cookie and redirect if server signout fails (e.g. token already invalid)
  }

  return redirect('/', {
    headers: {
      'Set-Cookie': getClearAuthCookieHeader(),
    },
  });
};

/**
 * @link https://reactrouter.com/start/framework/route-module#action
 * @description Support signout via POST as well as GET.
 */
export const action = async (args: Route.ActionArgs) => {
  const { request } = args;

  try {
    await executeGraphqlWithAuth(request, SignoutDocument);
  } catch (error) {
    console.error('🔴 signout - auth.logout action', error);
    // Still clear cookie and redirect if server signout fails (e.g. token already invalid)
  }

  return redirect('/', {
    headers: {
      'Set-Cookie': getClearAuthCookieHeader(),
    },
  });
};

export const ErrorBoundary = GlobalErrorBoundary;
