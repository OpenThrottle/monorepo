/**
 * @description GraphQL input for pruning stale worktree checkout rows.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType({
  description: `The worktree path a teardown just removed.`,
})
export class DeregisterWorktreeCheckoutInput {
  @Field(() => String, {
    description: `Absolute filesystem path of the removed worktree. Matched as given and by its real path.`,
  })
  filesystemPath!: string;
}

@InputType({
  description: `Registered worktree checkouts to delete. A request, not evidence: every guard is re-checked server-side.`,
})
export class PruneWorktreeCheckoutsInput {
  @Field(() => [ID], {
    description: `repository_checkouts ids, typically DiscoveredWorktrees.missingCheckouts. At most 200 distinct ids; duplicates are collapsed.`,
  })
  checkoutIds!: string[];
}
