/**
 * @description GraphQL payload for pruning stale worktree checkout rows: one outcome per requested
 * id, so a partial prune is reported rather than thrown.
 */

import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export const PruneWorktreeCheckoutOutcomeEnum = {
  NOT_FOUND: 'not-found',
  PRUNED: 'pruned',
  SKIPPED_ACTIVE_RUN: 'skipped-active-run',
  SKIPPED_LIVE: 'skipped-live',
  SKIPPED_PRIMARY: 'skipped-primary',
} as const;

export type PruneWorktreeCheckoutOutcomeEnum =
  (typeof PruneWorktreeCheckoutOutcomeEnum)[keyof typeof PruneWorktreeCheckoutOutcomeEnum];

registerEnumType(PruneWorktreeCheckoutOutcomeEnum, {
  description: `What happened to one requested checkout id.`,
  name: 'PruneWorktreeCheckoutOutcome',
  valuesMap: {
    NOT_FOUND: {
      description:
        'No checkout with that id is owned by the caller, or it was deleted concurrently.',
    },
    PRUNED: { description: 'The row was deleted.' },
    SKIPPED_ACTIVE_RUN: {
      description:
        'An unsettled (QUEUED or IN_PROGRESS) plan run still points at this checkout. Settle the run first.',
    },
    SKIPPED_LIVE: {
      description:
        'The path is a live linked worktree right now, so the row is not stale.',
    },
    SKIPPED_PRIMARY: {
      description:
        'The row is a primary checkout. Prune only ever deletes worktree rows.',
    },
  },
});

@ObjectType({ description: `The outcome for one requested checkout id.` })
export class PruneWorktreeCheckoutResultObject {
  @Field(() => ID)
  checkoutId!: string;

  @Field(() => PruneWorktreeCheckoutOutcomeEnum)
  outcome!: PruneWorktreeCheckoutOutcomeEnum;

  @Field(() => String, {
    description: `The registered path, or null when the checkout was not found.`,
    nullable: true,
  })
  path!: string | null;
}

@ObjectType({
  description: `Result of pruneWorktreeCheckouts: one entry per distinct requested id, in request order.`,
})
export class PruneWorktreeCheckoutsPayloadObject {
  @Field(() => [PruneWorktreeCheckoutResultObject])
  results!: PruneWorktreeCheckoutResultObject[];
}

@ObjectType({
  description: `Result of deregisterWorktreeCheckout for one removed worktree path.`,
})
export class DeregisterWorktreeCheckoutPayloadObject {
  @Field(() => ID, {
    description: `The checkout row at the path, or null when none is registered there for the caller.`,
    nullable: true,
  })
  checkoutId!: string | null;

  @Field(() => PruneWorktreeCheckoutOutcomeEnum, {
    description: `PRUNED when the row was deleted; NOT_FOUND when there was nothing to deregister (the normal case for a worktree OpenThrottle never registered).`,
  })
  outcome!: PruneWorktreeCheckoutOutcomeEnum;

  @Field(() => String, {
    description: `The registered path when a row matched, else the path as given.`,
  })
  path!: string;
}
