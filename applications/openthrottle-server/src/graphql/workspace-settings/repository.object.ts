/**
 * @description GraphQL objects for the repository/checkout identity model
 * (design doc §1): a shared repository keyed by normalized remote URL, the
 * user's on-disk checkouts, and the cached inspection snapshot.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

import { ProjectObject } from '../projects/project.object';

@ObjectType({
  description: `Presence of agent configuration files at the checkout root.`,
})
export class RepositoryInspectionAgentConfigObject {
  @Field(() => Boolean)
  agentsMd!: boolean;

  @Field(() => Boolean)
  claudeMd!: boolean;

  @Field(() => Boolean)
  cursorRules!: boolean;

  @Field(() => Boolean)
  mcpJson!: boolean;

  @Field(() => Boolean)
  skillsDir!: boolean;
}

@ObjectType({
  description: `Git state detected at the checkout root; nulls mean the probe failed or does not apply.`,
})
export class RepositoryInspectionGitObject {
  @Field(() => String, { nullable: true })
  currentBranch!: string | null;

  @Field(() => String, { nullable: true })
  defaultBranch!: string | null;

  @Field(() => Boolean, { nullable: true })
  dirty!: boolean | null;

  @Field(() => Boolean)
  isRepo!: boolean;

  @Field(() => [String])
  linkedWorktrees!: readonly string[];

  @Field(() => String, { nullable: true })
  normalizedRemoteUrl!: string | null;
}

@ObjectType({
  description: `Stack markers detected at the checkout root (root-level heuristics only).`,
})
export class RepositoryInspectionStackObject {
  @Field(() => [String])
  languages!: readonly string[];

  @Field(() => Boolean)
  nxWorkspace!: boolean;

  @Field(() => String, { nullable: true })
  packageManager!: string | null;

  @Field(() => Boolean)
  pnpmWorkspace!: boolean;

  @Field(() => Boolean)
  turbo!: boolean;
}

@ObjectType({
  description: `Whether this checkout can actually produce skill-usage telemetry, and if not why not. Carries no secret: the endpoint URL and auth token never cross this boundary, only whether each resolved and which location supplied it.`,
})
export class RepositoryInspectionHookTelemetryObject {
  @Field(() => Boolean, {
    description: `True when an auth token resolved. The token itself is never exposed.`,
  })
  authTokenConfigured!: boolean;

  @Field(() => Boolean, {
    description: `True when an endpoint resolved. The URL itself is never exposed.`,
  })
  endpointConfigured!: boolean;

  @Field(() => String, {
    description: `Which location supplied the endpoint: repo_env, process_env, user_env, or none.`,
  })
  endpointSource!: string;

  @Field(() => [String], {
    description: `Hook configs found in the checkout, e.g. claude, cursor, codex. Empty means nothing in this checkout wires the hooks up — an OT-orchestrated run still records, since the driver passes --plugin-dir at spawn time.`,
  })
  producers!: readonly string[];

  @Field(() => String, {
    description: `Machine-readable reason for a non-recording status: no_producer, no_endpoint, no_auth_token, or offline_flag. Null when recording.`,
    nullable: true,
  })
  reason!: string | null;

  @Field(() => String, {
    description: `recording, buffering, offline, or not_wired.`,
  })
  status!: string;

  @Field(() => String, {
    description: `Absolute path telemetry buffers to when it cannot be sent.`,
  })
  telemetryDir!: string;
}

@ObjectType({
  description: `Cached inspection snapshot for a checkout; disk is the source of truth and this refreshes on view (15-minute TTL) or via refreshCheckout.`,
})
export class RepositoryInspectionObject {
  @Field(() => RepositoryInspectionAgentConfigObject)
  agentConfig!: RepositoryInspectionAgentConfigObject;

  @Field(() => RepositoryInspectionGitObject)
  git!: RepositoryInspectionGitObject;

  @Field(() => RepositoryInspectionHookTelemetryObject, {
    description: `Absent on snapshots written before hook-readiness was reported; refresh the checkout to populate it.`,
    nullable: true,
  })
  hookTelemetry!: RepositoryInspectionHookTelemetryObject | null;

  @Field(() => Date)
  scannedAt!: Date;

  @Field(() => RepositoryInspectionStackObject)
  stack!: RepositoryInspectionStackObject;

  @Field(() => [String])
  warnings!: readonly string[];
}

@ObjectType({
  description: `A per-user on-disk instance of a repository. Paths are on the server host.`,
})
export class RepositoryCheckoutObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  repositoryId!: string;

  @Field(() => ID)
  userId!: string;

  @Field(() => String, {
    description: `Absolute path on the server host.`,
  })
  filesystemPath!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => Boolean, {
    description: `True when OpenThrottle cloned this checkout into the managed checkout root.`,
  })
  managed!: boolean;

  @Field(() => Boolean, {
    description: `True when this user opts this checkout into foreign-workspace skill injection (OpenThrottle curated skills projected in on foreign runs). Default false (opt-in).`,
  })
  foreignSkillInjectionEnabled!: boolean;

  @Field(() => String, {
    description: `'primary' or 'worktree' (worktree reserved for future workflow unification).`,
  })
  kind!: string;

  @Field(() => RepositoryInspectionObject, {
    description: `Cached inspection snapshot; null until the first scan completes.`,
    nullable: true,
  })
  inspection?: RepositoryInspectionObject | null;

  @Field(() => Date, { nullable: true })
  scannedAt!: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

@ObjectType({
  description: `A repository identity shared across users, keyed by normalized git remote URL; provisional (no remote) until one is detected.`,
})
export class RepositoryObject {
  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    description: `Canonical https form of the remote; null for provisional local-only repositories.`,
    nullable: true,
  })
  normalizedRemoteUrl!: string | null;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  defaultBranch!: string | null;

  @Field(() => ID, {
    description: `OpenThrottle project linked at the repository level.`,
    nullable: true,
  })
  projectId!: string | null;

  @Field(() => ProjectObject, { nullable: true })
  project?: ProjectObject | null;

  @Field(() => [RepositoryCheckoutObject], {
    description: `The authenticated user's checkouts of this repository.`,
  })
  checkouts?: RepositoryCheckoutObject[];

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
