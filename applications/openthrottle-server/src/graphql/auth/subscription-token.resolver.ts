/**
 * @description Authenticated resolver that mints a short-lived token for the
 * graphql-ws subscription handshake. Unlike AuthResolver (which is @Public), this
 * requires a valid API credential so identity comes from the authenticated
 * request — the browser calls it (via the developer app's same-origin
 * /auth/ws-token route, with the HttpOnly cookie) and passes the result in
 * connectionParams.authToken.
 */
import { Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { AuthService } from './auth.service';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver()
export class SubscriptionTokenResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => String, {
    description: `Mint a short-lived token (scoped to the current user) for authenticating a graphql-ws subscription connection via connectionParams.authToken.`,
  })
  mintSubscriptionToken(@CurrentUser('sub') userId: string): string {
    return this.authService.signSubscriptionToken(userId);
  }
}
