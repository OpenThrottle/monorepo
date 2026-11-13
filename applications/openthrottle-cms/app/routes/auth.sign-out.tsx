import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';

import type { Route } from '@/app/routes/+types/auth.sign-out';
import { signOut } from '~/routing/auth/utils/signOut.server';

/**
 * @description Visiting `/auth/sign-out` (or posting to it) signs out and goes home.
 */
export const loader = async (args: Route.LoaderArgs): Promise<Response> => {
  return signOut(args.request);
};

export const action = async (args: Route.ActionArgs): Promise<Response> => {
  return signOut(args.request);
};

export const ErrorBoundary = GlobalErrorBoundary;
