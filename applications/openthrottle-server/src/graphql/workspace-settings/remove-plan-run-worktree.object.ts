/**
 * @description GraphQL payload for removing one plan-run worktree from disk through the guarded
 * teardown (the ot-worktree destroy action, `destroy.sh`, branch kept). A guard that refuses is an outcome, not an
 * error, so the page can say why the worktree stayed.
 */

import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';

export type PlanRunWorktreeTeardownOutcomeEnum =
  (typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME)[keyof typeof PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME];

registerEnumType(PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME, {
  description: `What a guarded plan-run worktree teardown did.`,
  name: 'PlanRunWorktreeTeardownOutcome',
  valuesMap: {
    FAILED: {
      description: `A guard could not be evaluated or the ot-worktree destroy action failed. The worktree is still there.`,
    },
    KEPT_ACTIVE_RUN: {
      description: `A queued or in-progress plan run still points at this worktree.`,
    },
    KEPT_DIRTY: { description: 'The worktree has uncommitted changes.' },
    KEPT_NOT_PLAN_RUN_WORKTREE: {
      description: `Not a server-provisioned plan-<8> worktree under the worktree root.`,
    },
    KEPT_PRIMARY: { description: 'The path is the primary checkout.' },
    KEPT_UNPUSHED: {
      description: `The branch has commits that are not on its upstream or the default branch.`,
    },
    REMOVABLE: {
      description: `Every guard passes; reported only by an assessment, never by a removal.`,
    },
    REMOVED: {
      description: `The worktree directory and its checkout record are gone; the branch is kept.`,
    },
  },
});

@ObjectType({
  description: `Result of removePlanRunWorktree for one worktree checkout.`,
})
export class RemovePlanRunWorktreePayloadObject {
  @Field(() => String, {
    description: `The branch the worktree had checked out, which survives the removal. Null when nothing was removed.`,
    nullable: true,
  })
  branch!: string | null;

  @Field(() => ID)
  checkoutId!: string;

  @Field(() => String, {
    description: `Why the worktree was kept, in a sentence. Null when it was removed.`,
    nullable: true,
  })
  detail!: string | null;

  @Field(() => PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME)
  outcome!: PlanRunWorktreeTeardownOutcomeEnum;

  @Field(() => String, {
    description: `The worktree's path on the server host.`,
  })
  path!: string;
}
