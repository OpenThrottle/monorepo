/**
 * @description GraphQL ObjectTypes for the OAuth consent screen and connected-clients list (OT plan 16f321a7).
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `A pending OAuth authorization request, as the developer-app consent screen renders it.`,
})
export class OAuthAuthorizationRequestObject {
  @Field(() => String, {
    description: `The client's self-asserted name. Untrusted — show it beside clientHost.`,
    nullable: true,
  })
  clientName!: string | null;

  @Field(() => String, {
    description: `The host the client is identified by (CIMD URL host, client_uri host, or redirect URI host or scheme).`,
  })
  clientHost!: string;

  @Field(() => Date)
  expiresAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => String, {
    description: `Where the browser returns after the decision (host only).`,
  })
  redirectHost!: string;

  @Field(() => String, {
    description: `dcr (registered via POST /oauth/register) or cimd (Client ID Metadata Document).`,
  })
  registrationKind!: string;

  @Field(() => [String], {
    description: `Scopes the client asked for: mcp:read, mcp:write.`,
  })
  requestedScopes!: string[];

  @Field(() => String, {
    description: `The MCP resource URL the token will be bound to.`,
  })
  resource!: string;
}

@ObjectType({
  description: `Where to send the browser after an OAuth consent decision.`,
})
export class DecideOAuthAuthorizationResultObject {
  @Field(() => String, {
    description: `The client's redirect URI carrying code (approve) or error=access_denied (deny), plus state and iss.`,
  })
  redirectUrl!: string;
}

@ObjectType({
  description: `A client the signed-in user has authorized to use the MCP server on their behalf.`,
})
export class OAuthGrantObject {
  @Field(() => String)
  clientHost!: string;

  @Field(() => String, { nullable: true })
  clientName!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, {
    description: `Grants last 30 days from consent; refreshing never extends them.`,
  })
  expiresAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => Date, { nullable: true })
  lastUsedAt!: Date | null;

  @Field(() => String)
  resource!: string;

  @Field(() => [String])
  scopes!: string[];
}
