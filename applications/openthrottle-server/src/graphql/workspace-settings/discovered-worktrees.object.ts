/**
 * @description GraphQL payload for worktrees found ON DISK for the authenticated user's
 * repositories, whether or not OpenThrottle provisioned them. Paths are on the server host.
 */

import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export const WorktreeActivityEnum = {
  DIRTY: 'DIRTY',
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
} as const;

export type WorktreeActivityEnum =
  (typeof WorktreeActivityEnum)[keyof typeof WorktreeActivityEnum];

registerEnumType(WorktreeActivityEnum, {
  description: `What a discovered worktree is doing. Never inferred from the directory merely existing.`,
  name: 'WorktreeActivity',
  valuesMap: {
    DIRTY: {
      description:
        'No live run, but there is uncommitted work or commits ahead of the upstream.',
    },
    IDLE: { description: 'Clean, with nothing running.' },
    RUNNING: {
      description:
        'A live IN_PROGRESS plan run is executing here — live meaning its heartbeat is inside the staleness cutoff. A stale IN_PROGRESS run is dead and does NOT read as running.',
    },
  },
});

export const WorktreeRootSourceEnum = {
  CHECKOUT_ENV: 'checkout-env',
  DEFAULT: 'default',
  ENV: 'env',
  SETTINGS: 'settings',
} as const;

export type WorktreeRootSourceEnum =
  (typeof WorktreeRootSourceEnum)[keyof typeof WorktreeRootSourceEnum];

registerEnumType(WorktreeRootSourceEnum, {
  description: `Which rung of the shared worktree-root ladder resolved the scanned root. The same ladder scripts/create_worktree.sh applies, so the page can never disagree with where the script writes.`,
  name: 'WorktreeRootSource',
  valuesMap: {
    CHECKOUT_ENV: {
      description: 'OT_WORKTREE_ROOT in the base checkout’s .env file.',
    },
    DEFAULT: {
      description:
        'The historical default: a sibling openthrottle-worktrees directory next to the base checkout.',
    },
    ENV: {
      description: "OT_WORKTREE_ROOT in the server process's environment.",
    },
    SETTINGS: {
      description:
        'The workspace-level worktree root configured on /settings/workspace.',
    },
  },
});

@ObjectType({
  description: `A linked git worktree that exists on disk right now (server-host path).`,
})
export class DiscoveredWorktreeObject {
  @Field(() => WorktreeActivityEnum, {
    description: `RUNNING / DIRTY / IDLE. See WorktreeActivity for what does and does not count as running.`,
  })
  activity!: WorktreeActivityEnum;

  @Field(() => String, {
    description: `Checked-out branch, or null when the worktree is on a detached HEAD or the probe failed.`,
    nullable: true,
  })
  branch!: string | null;

  @Field(() => ID, {
    description: `The registered repository_checkouts row at this path, or null when the worktree is unregistered.`,
    nullable: true,
  })
  checkoutId!: string | null;

  @Field(() => String, {
    description: `Directory name, which is also the worktree's name and its branch suffix.`,
  })
  name!: string;

  @Field(() => String, {
    description: `Absolute, symlink-resolved path on the server host.`,
  })
  path!: string;

  @Field(() => ID, {
    description: `The plan the live run belongs to; only set when activity is RUNNING. There is no plan-run detail route, so this is what the UI links to.`,
    nullable: true,
  })
  planId!: string | null;

  @Field(() => ID, {
    description: `The live plan run executing here; only set when activity is RUNNING.`,
    nullable: true,
  })
  planRunId!: string | null;

  @Field(() => ID, {
    description: `Owning repository, resolved from the registered checkout or from the worktree's git common dir. Null when the owning repository is not registered for this user.`,
    nullable: true,
  })
  repositoryId!: string | null;

  @Field(() => Boolean, {
    description: `True when no repository_checkouts row exists at this path for this user. Orthogonal to activity — an unregistered worktree can be DIRTY.`,
  })
  unregistered!: boolean;
}

@ObjectType({
  description: `Result of one on-disk worktree scan: what was found, where it was looked for, and anything that went wrong along the way.`,
})
export class DiscoveredWorktreesObject {
  @Field(() => Int, {
    description: `Worktrees found beyond the hard cap and therefore not listed. Always accompanied by a warning — discovery never truncates silently.`,
  })
  droppedCount!: number;

  @Field(() => WorktreeRootSourceEnum, {
    description: `Which rung of the ladder produced worktreeRoot; null when no root could be resolved.`,
    nullable: true,
  })
  rootSource!: WorktreeRootSourceEnum | null;

  @Field(() => String, {
    description: `ISO timestamp of this scan. Discovery runs live on every request; there is no cached snapshot.`,
  })
  scannedAt!: string;

  @Field(() => [String], {
    description: `Non-fatal problems (an unreadable root, a failed git probe, the cap). Discovery degrades to warnings rather than failing the page.`,
  })
  warnings!: string[];

  @Field(() => String, {
    description: `The resolved root that was scanned; null when none could be resolved (no registered primary checkout). When several primaries resolve to different roots, this is the first — every root is still scanned.`,
    nullable: true,
  })
  worktreeRoot!: string | null;

  @Field(() => [DiscoveredWorktreeObject])
  worktrees!: DiscoveredWorktreeObject[];
}
