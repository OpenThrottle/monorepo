/**
 * @description GraphQL input for the OAuth consent decision.
 */

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DecideOAuthAuthorizationInput {
  @Field(() => Boolean, {
    description: `true to approve, false to deny.`,
  })
  approve!: boolean;

  @Field(() => String, {
    description: `The authorization request id from the consent URL.`,
  })
  id!: string;

  @Field(() => [String], {
    description: `Scopes to grant, a subset of the requested scopes. Ignored on deny.`,
  })
  scopes!: string[];
}
