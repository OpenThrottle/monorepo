/**
 * @description Same-origin resource route that mints a short-lived token for the
 * graphql-ws subscription handshake. The browser fetches /auth/ws-token (sending
 * the HttpOnly auth cookie automatically); the loader reads that cookie and calls
 * the authenticated mintSubscriptionToken mutation server-side, returning the
 * short-lived token as JSON. The durable cookie never reaches client JS. Mirrors
 * the developer app's route.
 */
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { MintSubscriptionTokenDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/auth.ws-token';

export const loader = async (
  args: Route.LoaderArgs,
): Promise<{ token: string }> => {
  const data = await executeGraphqlWithAuth(
    args.request,
    MintSubscriptionTokenDocument,
  );

  return { token: data.mintSubscriptionToken };
};
