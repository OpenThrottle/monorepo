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
} as const;

export type WorktreeRootSourceEnum =
  (typeof WorktreeRootSourceEnum)[keyof typeof WorktreeRootSourceEnum];

registerEnumType(WorktreeRootSourceEnum, {
  description: `Which rung of the shared worktree-root ladder resolved the scanned root. The same ladder skills/ot-worktree/scripts/root.sh applies, so the page can never disagree with where the script writes.`,
  name: 'WorktreeRootSource',
  valuesMap: {
    CHECKOUT_ENV: {
      description:
        'OPENTHROTTLE_WORKTREE_ROOT in the target repo’s .env file — how a repo customizes where its worktrees go.',
    },
    DEFAULT: {
      description:
        'The default: ~/.openthrottle/worktrees, the hidden root OpenThrottle owns. OT appends <org>/<repo> beneath it, taken from the checkout’s git remote.',
    },
    ENV: {
      description:
        "OPENTHROTTLE_WORKTREE_ROOT in the server process's environment.",
    },
  },
});

export const WorktreeDiscoveryProblemKindEnum = {
  CAP_EXCEEDED: 'cap-exceeded',
  CHECKOUT_LIST_FAILED: 'checkout-list-failed',
  NOT_A_GIT_REPO: 'not-a-git-repo',
  PROBE_FAILED: 'probe-failed',
  ROOT_UNREADABLE: 'root-unreadable',
  STALE_WORKTREE_ENTRY: 'stale-worktree-entry',
} as const;

export type WorktreeDiscoveryProblemKindEnum =
  (typeof WorktreeDiscoveryProblemKindEnum)[keyof typeof WorktreeDiscoveryProblemKindEnum];

registerEnumType(WorktreeDiscoveryProblemKindEnum, {
  description: `What a scan noticed that was less than complete. The server decides WHAT happened; the client decides how loud it is. States that are merely the healthy default — above all a repository that has no worktrees yet — are not problems and are never reported.`,
  name: 'WorktreeDiscoveryProblemKind',
  valuesMap: {
    CAP_EXCEEDED: {
      description:
        'More worktrees exist than the hard cap; the overflow is counted in droppedCount and not listed.',
    },
    CHECKOUT_LIST_FAILED: {
      description:
        'The registered checkouts could not be listed, so the scan had nothing to scan from. The whole result is empty.',
    },
    NOT_A_GIT_REPO: {
      description:
        'A registered folder is not a git checkout at all. Carries repositoryId — belongs on that repository’s row, not on the page.',
    },
    PROBE_FAILED: {
      description:
        'A read-only git probe against a directory that does exist failed. The genuinely degraded case: worktrees may be missing from the list.',
    },
    ROOT_UNREADABLE: {
      description:
        'A worktree root exists but could not be read (EACCES and friends). A root that simply does not exist is NOT this — that is a repository with no worktrees yet, and is silent.',
    },
    STALE_WORKTREE_ENTRY: {
      description:
        'git still reports a worktree whose directory is gone. Actionable exactly once, with `git worktree prune`; the path is never probed.',
    },
  },
});

@ObjectType({
  description: `One classified, non-fatal thing that happened during a scan.`,
})
export class WorktreeDiscoveryProblemObject {
  @Field(() => String, {
    description: `The raw underlying message (errno text, git stderr). For diagnostics — the sentence shown to a person is derived from kind, never from this.`,
  })
  detail!: string;

  @Field(() => WorktreeDiscoveryProblemKindEnum, {
    description: `What happened. See WorktreeDiscoveryProblemKind.`,
  })
  kind!: WorktreeDiscoveryProblemKindEnum;

  @Field(() => String, {
    description: `The directory the problem is about, or null when it is not about one (the cap).`,
    nullable: true,
  })
  path!: string | null;

  @Field(() => ID, {
    description: `Set only when the problem is attributable to one registered repository, so the UI can report it on that row instead of page-wide.`,
    nullable: true,
  })
  repositoryId!: string | null;
}

@ObjectType({
  description: `One resolved worktree root and what the depth-1 scan of it found.`,
})
export class ScannedWorktreeRootObject {
  @Field(() => Boolean, {
    description: `Whether the directory is there at all. False is the ordinary state of a repository with no worktrees yet — it is data, not a failure.`,
  })
  exists!: boolean;

  @Field(() => String, { description: `Absolute path on the server host.` })
  path!: string;

  @Field(() => WorktreeRootSourceEnum, {
    description: `Which rung of the shared ladder resolved this root.`,
  })
  source!: WorktreeRootSourceEnum;

  @Field(() => Int, {
    description: `Linked worktrees this root contributed to the result.`,
  })
  worktreeCount!: number;
}

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

  @Field(() => [WorktreeDiscoveryProblemObject], {
    description: `Classified non-fatal problems. Empty on a healthy machine — a repository with no worktrees yet reports nothing at all.`,
  })
  problems!: WorktreeDiscoveryProblemObject[];

  @Field(() => WorktreeRootSourceEnum, {
    description: `Which rung of the ladder produced worktreeRoot; null when no root could be resolved.`,
    nullable: true,
  })
  rootSource!: WorktreeRootSourceEnum | null;

  @Field(() => String, {
    description: `ISO timestamp of this scan. Discovery runs live on every request; there is no cached snapshot.`,
  })
  scannedAt!: string;

  @Field(() => [ScannedWorktreeRootObject], {
    description: `Every root the scan looked in. worktreeRoot names only the first, which misrepresents a machine whose primaries resolve to several roots.`,
  })
  scannedRoots!: ScannedWorktreeRootObject[];

  @Field(() => [String], {
    deprecationReason: `Use problems — warnings is unclassified free text and cannot be presented per-kind.`,
    description: `Non-fatal problems as flat sentences, one per entry in problems.`,
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
