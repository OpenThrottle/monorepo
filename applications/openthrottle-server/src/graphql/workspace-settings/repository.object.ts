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
  description: `Cached inspection snapshot for a checkout; disk is the source of truth and this refreshes on view (15-minute TTL) or via refreshCheckout.`,
})
export class RepositoryInspectionObject {
  @Field(() => RepositoryInspectionAgentConfigObject)
  agentConfig!: RepositoryInspectionAgentConfigObject;

  @Field(() => RepositoryInspectionGitObject)
  git!: RepositoryInspectionGitObject;

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
