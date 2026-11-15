/**
 * @description GraphQL input for pruning stale worktree checkout rows.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';

@InputType({
  description: `Who removed a worktree and how: the fields ot-worktree's destroy.sh writes to its local removal log. Every field is untrusted, optional and truncated server-side; a malformed value is dropped rather than failing the deregistration.`,
})
export class WorktreeRemovalAuditInput {
  @Field(() => String, {
    description: `Calling agent's session id when its harness exports one (Claude Code: CLAUDE_CODE_SESSION_ID).`,
    nullable: true,
  })
  agentSession!: string | null;

  @Field(() => String, {
    description: `A few levels of "pid command" above the parent process, joined by " <- ".`,
    nullable: true,
  })
  ancestry!: string | null;

  @Field(() => String, {
    description: `Branch the worktree had checked out.`,
    nullable: true,
  })
  branch!: string | null;

  @Field(() => String, {
    description: `Command line of destroy.sh's parent process.`,
    nullable: true,
  })
  parent!: string | null;

  @Field(() => Int, {
    description: `destroy.sh process id on the client machine.`,
    nullable: true,
  })
  pid!: number | null;

  @Field(() => Int, {
    description: `Parent process id of destroy.sh on the client machine.`,
    nullable: true,
  })
  ppid!: number | null;

  @Field(() => String, {
    description: `Outcome of destroy.sh's pre-removal active-run probe.`,
    nullable: true,
  })
  probe!: string | null;

  @Field(() => String, {
    description: `destroy.sh's own result for the invocation, e.g. removed.`,
    nullable: true,
  })
  result!: string | null;

  @Field(() => String, {
    description: `Client-side ISO-8601 timestamp of the removal. Ignored when unparseable.`,
    nullable: true,
  })
  ts!: string | null;
}

@InputType({
  description: `The worktree path a teardown just removed.`,
})
export class DeregisterWorktreeCheckoutInput {
  @Field(() => WorktreeRemovalAuditInput, {
    description: `Who removed the worktree and how. When present the server records the removal (whatever the outcome) so it can be attributed without the client's local log; omitted by the pre-removal active-run probe, which records nothing.`,
    nullable: true,
  })
  audit?: WorktreeRemovalAuditInput | null;

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
