import { Field, ObjectType } from '@nestjs/graphql';

import type { UserEnvFileHealthStatus } from '../../../services/user-env-file/user-env-file.types.ts';

@ObjectType({
  description: `Whether ~/.openthrottle/.env lets agents in other checkouts on this machine reach this server. Statuses only; the token is never returned.`,
})
export class UserEnvFileHealthObject {
  @Field(() => String, {
    description: `GraphQL endpoint line: ok | missing | stale (a managed line for another port) | user_set | unreadable | not_applicable (worktree, container or portless server).`,
  })
  endpoint!: UserEnvFileHealthStatus;

  @Field(() => String, {
    description: `Auth token line: ok | missing | stale (no longer authenticates) | user_set (set by the user and authenticates) | unreadable | not_applicable.`,
  })
  token!: UserEnvFileHealthStatus;
}
