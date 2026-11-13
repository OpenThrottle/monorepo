import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { redirect } from 'react-router';

import type { Route } from '@/app/routes/+types/auth._index';
import { AUTH_ROUTES } from '~/routing/auth/data/data.routes';

/**
 * @description `/auth` has no page of its own: it forwards to sign-in, keeping the query string.
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { search } = new URL(args.request.url);

  return redirect(`${AUTH_ROUTES.signIn}${search}`);
};

export const ErrorBoundary = GlobalErrorBoundary;
