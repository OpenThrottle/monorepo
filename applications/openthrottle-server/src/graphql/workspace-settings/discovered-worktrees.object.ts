/**
 * @description GraphQL payload for worktrees found ON DISK for the authenticated user's
 * repositories, whether or not OpenThrottle provisioned them. Paths are on the server host.
 */

import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';

export const WORKTREE_ACTIVITY = {
  DIRTY: 'DIRTY',
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
} as const;

export type WorktreeActivityKey = keyof typeof WORKTREE_ACTIVITY;
export type WorktreeActivityValue =
  (typeof WORKTREE_ACTIVITY)[WorktreeActivityKey];

registerEnumType(WORKTREE_ACTIVITY, {
  description: `What a discovered worktree is doing. Never inferred from the directory merely existing.`,
  name: 'WorktreeActivity',
  valuesMap: {
    DIRTY: {
      description: `No live run, but there is uncommitted work or commits ahead of the upstream.`,
    },
    IDLE: { description: 'Clean, with nothing running.' },
    RUNNING: {
      description: `A live IN_PROGRESS plan run is executing here — live meaning its heartbeat is inside the staleness cutoff. A stale IN_PROGRESS run is dead and does NOT read as running.`,
    },
  },
});

export const WORKTREE_ROOT_SOURCE = {
  CHECKOUT_ENV: 'checkout-env',
  DEFAULT: 'default',
  ENV: 'env',
} as const;

export type WorktreeRootSourceKey = keyof typeof WORKTREE_ROOT_SOURCE;
export type WorktreeRootSourceValue =
  (typeof WORKTREE_ROOT_SOURCE)[WorktreeRootSourceKey];

registerEnumType(WORKTREE_ROOT_SOURCE, {
  description: `Which rung of the shared worktree-root ladder resolved the scanned root. The same ladder skills/ot-worktree/scripts/root.sh applies, so the page can never disagree with where the script writes.`,
  name: 'WorktreeRootSource',
  valuesMap: {
    CHECKOUT_ENV: {
      description: `OPENTHROTTLE_WORKTREE_ROOT in the target repo’s .env file — how a repo customizes where its worktrees go.`,
    },
    DEFAULT: {
      description: `The default: ~/.openthrottle/worktrees, the hidden root OpenThrottle owns. OT appends <org>/<repo> beneath it, taken from the checkout’s git remote.`,
    },
    ENV: {
      description: `OPENTHROTTLE_WORKTREE_ROOT in the server process's environment.`,
    },
  },
});

export const WORKTREE_DISCOVERY_PROBLEM_KIND = {
  CAP_EXCEEDED: 'cap-exceeded',
  CHECKOUT_LIST_FAILED: 'checkout-list-failed',
  NOT_A_GIT_REPO: 'not-a-git-repo',
  ORPHAN_DIRECTORY: 'orphan-directory',
  PROBE_FAILED: 'probe-failed',
  ROOT_UNREADABLE: 'root-unreadable',
  STALE_WORKTREE_ENTRY: 'stale-worktree-entry',
} as const;

export type WorktreeDiscoveryProblemKindKey =
  keyof typeof WORKTREE_DISCOVERY_PROBLEM_KIND;
export type WorktreeDiscoveryProblemKindValue =
  (typeof WORKTREE_DISCOVERY_PROBLEM_KIND)[WorktreeDiscoveryProblemKindKey];

registerEnumType(WORKTREE_DISCOVERY_PROBLEM_KIND, {
  description: `What a scan noticed that was less than complete. The server decides WHAT happened; the client decides how loud it is. States that are merely the healthy default — above all a repository that has no worktrees yet — are not problems and are never reported.`,
  name: 'WorktreeDiscoveryProblemKind',
  valuesMap: {
    CAP_EXCEEDED: {
      description: `More worktrees exist than the hard cap; the overflow is counted in droppedCount and not listed.`,
    },
    CHECKOUT_LIST_FAILED: {
      description: `The registered checkouts could not be listed, so the scan had nothing to scan from. The whole result is empty.`,
    },
    NOT_A_GIT_REPO: {
      description: `A registered folder is not a git checkout at all. Carries repositoryId — belongs on that repository’s row, not on the page.`,
    },
    ORPHAN_DIRECTORY: {
      description: `A directory in a worktree root with no .git at all — the husk a removed worktree leaves behind. Not a worktree and never probed; nothing deletes it automatically.`,
    },
    PROBE_FAILED: {
      description: `A read-only git probe against a directory that does exist failed. The genuinely degraded case: worktrees may be missing from the list.`,
    },
    ROOT_UNREADABLE: {
      description: `A worktree root exists but could not be read (EACCES and friends). A root that simply does not exist is NOT this — that is a repository with no worktrees yet, and is silent.`,
    },
    STALE_WORKTREE_ENTRY: {
      description: `git still reports a worktree whose directory is gone. Actionable exactly once, with \`git worktree prune\`; the path is never probed.`,
    },
  },
});

export const MISSING_WORKTREE_CHECKOUT_REASON = {
  NOT_A_WORKTREE: 'not-a-worktree',
  PATH_GONE: 'path-gone',
} as const;

export type MissingWorktreeCheckoutReasonKey =
  keyof typeof MISSING_WORKTREE_CHECKOUT_REASON;
export type MissingWorktreeCheckoutReasonValue =
  (typeof MISSING_WORKTREE_CHECKOUT_REASON)[MissingWorktreeCheckoutReasonKey];

registerEnumType(MISSING_WORKTREE_CHECKOUT_REASON, {
  description: `Why a registered worktree checkout has no live worktree behind it.`,
  name: 'MissingWorktreeCheckoutReason',
  valuesMap: {
    NOT_A_WORKTREE: {
      description: `Something exists at the path, but it is not a linked worktree — a husk directory with no .git, or a real clone.`,
    },
    PATH_GONE: { description: 'Nothing exists at the path any more.' },
  },
});

@ObjectType({
  description: `One worktree removal reported by ot-worktree's destroy.sh with its deregistration: who removed it, how, and what the server did with the checkout record. Client-supplied fields are untrusted.`,
})
export class WorktreeRemovalObject {
  @Field(() => String, {
    description: `The calling agent's session id, when its harness exported one.`,
    nullable: true,
  })
  agentSession!: string | null;

  @Field(() => String, {
    description: `A few levels of "pid command" above the parent process.`,
    nullable: true,
  })
  ancestry!: string | null;

  @Field(() => String, {
    description: `Branch the worktree had checked out.`,
    nullable: true,
  })
  branch!: string | null;

  @Field(() => Date, { description: `When the server recorded the removal.` })
  createdAt!: Date;

  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    description: `What the server did with the checkout record (a PruneWorktreeCheckoutOutcome value, lower-kebab: pruned, not-found, skipped-active-run, skipped-live, skipped-primary).`,
  })
  outcome!: string;

  @Field(() => String, {
    description: `Command line of destroy.sh's parent process.`,
    nullable: true,
  })
  parentCommand!: string | null;

  @Field(() => Date, {
    description: `When the client says the removal happened, or null when it sent no usable time.`,
    nullable: true,
  })
  removedAt!: Date | null;

  @Field(() => String, {
    description: `destroy.sh's own result, e.g. removed.`,
    nullable: true,
  })
  result!: string | null;
}

@ObjectType({
  description: `A registered repository_checkouts row of kind worktree that discovery could not match to a live worktree. Reported only — removing the row is the explicit pruneWorktreeCheckouts mutation.`,
})
export class MissingWorktreeCheckoutObject {
  @Field(() => WorktreeRemovalObject, {
    description: `The latest removal ot-worktree reported for this path, or null when none was (removed by hand, by an older teardown, or while the server was unreachable). Usually the row survived because an unsettled plan run still pointed at it.`,
    nullable: true,
  })
  lastRemoval!: WorktreeRemovalObject | null;

  @Field(() => ID, { description: `The orphaned repository_checkouts row.` })
  checkoutId!: string;

  @Field(() => String, {
    description: `The path as registered. It no longer resolves, so it is not symlink-resolved.`,
  })
  path!: string;

  @Field(() => MISSING_WORKTREE_CHECKOUT_REASON, {
    description: `Whether the path is gone or merely is not a worktree.`,
  })
  reason!: MissingWorktreeCheckoutReasonValue;

  @Field(() => ID, { description: `The repository the row belongs to.` })
  repositoryId!: string;
}

@ObjectType({
  description: `One classified, non-fatal thing that happened during a scan.`,
})
export class WorktreeDiscoveryProblemObject {
  @Field(() => String, {
    description: `The raw underlying message (errno text, git stderr). For diagnostics — the sentence shown to a person is derived from kind, never from this.`,
  })
  detail!: string;

  @Field(() => WORKTREE_DISCOVERY_PROBLEM_KIND, {
    description: `What happened. See WorktreeDiscoveryProblemKind.`,
  })
  kind!: WorktreeDiscoveryProblemKindValue;

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
  @Field(() => String, {
    description: `The configured worktree root this directory sits under, before OpenThrottle joins <org>/<repo> onto it — absolute and ~-expanded, on the server host. This is the value to show a person; path is one repository's folder beneath it. Several scanned roots share a baseRoot whenever their repositories share a configured root, so de-duplicate before listing.`,
  })
  baseRoot!: string;

  @Field(() => Boolean, {
    description: `Whether the directory is there at all. False is the ordinary state of a repository with no worktrees yet — it is data, not a failure.`,
  })
  exists!: boolean;

  @Field(() => String, {
    description: `The directory actually scanned: baseRoot joined with the repository's <org>/<repo>. Absolute path on the server host.`,
  })
  path!: string;

  @Field(() => WORKTREE_ROOT_SOURCE, {
    description: `Which rung of the shared ladder resolved this root.`,
  })
  source!: WorktreeRootSourceValue;

  @Field(() => Int, {
    description: `Linked worktrees this root contributed to the result.`,
  })
  worktreeCount!: number;
}

@ObjectType({
  description: `A linked git worktree that exists on disk right now (server-host path).`,
})
export class DiscoveredWorktreeObject {
  /**
   * @description NOT a GraphQL field. The worktree's resolved git common dir, carried so the
   * `safeToRemove` field resolver (DiscoveredWorktreeResolver) can find its primary checkout without
   * re-probing git.
   */
  commonDir!: string | null;

  /**
   * @description NOT a GraphQL field. Discovery's `git status` verdict (null when the probe
   * failed), carried so `safeToRemove` can answer a dirty worktree without re-running it.
   */
  dirty!: boolean | null;

  @Field(() => WORKTREE_ACTIVITY, {
    description: `RUNNING / DIRTY / IDLE. See WorktreeActivity for what does and does not count as running.`,
  })
  activity!: WorktreeActivityValue;

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
    description: `Whether the live run's liveness is VERIFIED rather than merely claimed. True when the run heartbeats on a timer, so RUNNING is a checked fact. False when it does not (an interactive /ot-loop run): the row says IN_PROGRESS and nothing confirms it, so this worktree may be held busy by an agent that died hours ago — surface that distinctly rather than showing it as healthily running. Null when nothing is running.`,
    nullable: true,
  })
  runMonitored!: boolean | null;

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

  @Field(() => [MissingWorktreeCheckoutObject], {
    description: `Registered worktree checkouts with no live worktree behind them, ordered by path — rows left behind when a worktree was removed outside OpenThrottle. Matched against every live worktree before the cap, so a capped scan never reports a live one here.`,
  })
  missingCheckouts!: MissingWorktreeCheckoutObject[];

  @Field(() => [WorktreeDiscoveryProblemObject], {
    description: `Classified non-fatal problems. Empty on a healthy machine — a repository with no worktrees yet reports nothing at all.`,
  })
  problems!: WorktreeDiscoveryProblemObject[];

  @Field(() => WORKTREE_ROOT_SOURCE, {
    description: `Which rung of the ladder produced worktreeRoot; null when no root could be resolved.`,
    nullable: true,
  })
  rootSource!: WorktreeRootSourceValue | null;

  @Field(() => String, {
    description: `ISO timestamp of this scan. Discovery runs live on every request; there is no cached snapshot.`,
  })
  scannedAt!: string;

  @Field(() => [ScannedWorktreeRootObject], {
    description: `Every root the scan looked in, each carrying the configured baseRoot it sits under and the rung that set it.`,
  })
  scannedRoots!: ScannedWorktreeRootObject[];

  @Field(() => [String], {
    deprecationReason: `Use problems — warnings is unclassified free text and cannot be presented per-kind.`,
    description: `Non-fatal problems as flat sentences, one per entry in problems.`,
  })
  warnings!: string[];

  @Field(() => String, {
    deprecationReason: `Use scannedRoots.baseRoot — worktreeRoot is the first primary's <root>/<org>/<repo> folder, not the configured root, and names only one of several.`,
    description: `The first resolved per-repository folder that was scanned; null when none could be resolved (no registered primary checkout).`,
    nullable: true,
  })
  worktreeRoot!: string | null;

  @Field(() => [DiscoveredWorktreeObject])
  worktrees!: DiscoveredWorktreeObject[];
}
