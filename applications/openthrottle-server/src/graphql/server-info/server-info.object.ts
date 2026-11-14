/**
 * @description GraphQL ObjectType for serverInfo. Hand-written @ObjectType class — there is no
 * Result / ListResult factory.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `Static facts about the running server build.`,
})
export class ServerInfoObject {
  @Field(() => String, {
    description: `The server's own package.json version (applications/openthrottle-server), as bumped by release automation.`,
  })
  version!: string;
}
