/**
 * @description Same-origin resource route that mints a short-lived token for the
 * graphql-ws subscription handshake. The browser fetches /auth/ws-token (sending
 * the HttpOnly auth cookie automatically); the loader reads that cookie and calls
 * the authenticated mintSubscriptionToken mutation server-side, returning the
 * short-lived token as JSON. The durable cookie never reaches client JS.
 */
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { MintSubscriptionTokenDocument } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/auth.ws-token';

export const loader = async (
  args: Route.LoaderArgs,
): Promise<{ token: string }> => {
  try {
    const data = await executeGraphqlWithAuth(
      args.request,
      MintSubscriptionTokenDocument,
    );

    return { token: data.mintSubscriptionToken };
  } catch (error) {
    console.error('🔴 ws-token loader', error);

    /**
     * The subscription client requests a token on mount — including on the
     * unauthenticated /auth page, where there is no cookie to mint against.
     * Don't turn that (or a transient mint failure) into a 500: return an
     * empty token and let the ws client stay disconnected until sign-in.
     */
    return { token: '' };
  }
};
