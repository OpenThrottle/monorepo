/**
 * @description GraphQL payloads for the add-folder onboarding gesture:
 * discovered candidates, directory browsing, the enriched add result, and
 * refresh drift flags. Paths are on the server host (design doc §8).
 */

import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ProjectObject } from '../projects/project.object';
import {
  RepositoryCheckoutObject,
  RepositoryObject,
} from './repository.object';

export const WorkspaceFolderReconciliationEnum = {
  CREATED_CANONICAL: 'created_canonical',
  CREATED_PROVISIONAL: 'created_provisional',
  MATCHED_MANIFEST_CHECKOUT: 'matched_manifest_checkout',
  MATCHED_MANIFEST_REPOSITORY: 'matched_manifest_repository',
  MATCHED_REMOTE: 'matched_remote',
} as const;

export type WorkspaceFolderReconciliationEnum =
  (typeof WorkspaceFolderReconciliationEnum)[keyof typeof WorkspaceFolderReconciliationEnum];

registerEnumType(WorkspaceFolderReconciliationEnum, {
  description: `How addWorkspaceFolder resolved the folder's identity: via the on-disk OT manifest (checkout or repository id), via the normalized git remote, or by creating a new canonical/provisional repository.`,
  name: 'WorkspaceFolderReconciliation',
});

@ObjectType({
  description: `A folder found under a configured workspace root (server-host path) that looks like a git repository.`,
})
export class DiscoveredFolderObject {
  @Field(() => Boolean, {
    description: `True when this folder is already registered (matched by OT manifest id or by path).`,
  })
  alreadyRegistered!: boolean;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `Absolute path on the server host.`,
  })
  path!: string;
}

@ObjectType({
  description: `A subdirectory listed by browseDirectory (server-host path).`,
})
export class BrowseDirectoryEntryObject {
  @Field(() => Boolean, {
    description: `True when this subdirectory is already registered as a checkout (matched by path or OT manifest checkout id).`,
  })
  alreadyRegistered!: boolean;

  @Field(() => Boolean, {
    description: `True when this subdirectory contains a .git entry (looks like a git repository).`,
  })
  isGitRepo!: boolean;

  @Field(() => String)
  name!: string;

  @Field(() => String, {
    description: `Absolute path on the server host.`,
  })
  path!: string;
}

@ObjectType({
  description: `An interactive listing from browseDirectory: the current directory's immediate subdirectories plus the navigation context (current + parent path, and whether the current directory is itself a git repo) so the client can render a breadcrumb, an Up control, and an "add this folder" action. All paths are on the server host.`,
})
export class WorkspaceDirectoryListingObject {
  @Field(() => [BrowseDirectoryEntryObject], {
    description: `Immediate subdirectories of the current directory (or the configured roots when listing roots).`,
  })
  entries!: BrowseDirectoryEntryObject[];

  @Field(() => Boolean, {
    description: `True when the currently-browsed directory is itself a git repository. Always false when listing roots (path is null).`,
  })
  isGitRepo!: boolean;

  @Field(() => String, {
    description: `Absolute host path one level up, or null when at/above a configured root (containment-guarded) or when listing roots.`,
    nullable: true,
  })
  parentPath!: string | null;

  @Field(() => String, {
    description: `Canonical absolute host path of the currently-browsed directory, or null when listing the configured roots (no directory is "current").`,
    nullable: true,
  })
  path!: string | null;
}

@ObjectType({
  description: `Capabilities that seed the add-folder picker: whether a native OS folder dialog can be opened on the server host, the configured workspace roots (host view), and a default path to open the in-app picker at — all server-host paths.`,
})
export class WorkspacePickerCapabilitiesObject {
  @Field(() => Boolean, {
    description: `True when the openthrottle-server host can open a native OS folder dialog for this request (request is loopback + a display is present, or forced via OPENTHROTTLE_NATIVE_PICKER). The client uses this to choose the Browse affordance; the pickFolderNative mutation re-checks it before spawning.`,
  })
  canUseNativeDialog!: boolean;

  @Field(() => String, {
    description: `Absolute server-host path to seed the in-app picker at: the first configured workspace root, else the host home directory.`,
  })
  defaultBrowsePath!: string;

  @Field(() => [String], {
    description: `Configured OPENTHROTTLE_WORKSPACE_ROOTS in the host view; empty when unset.`,
  })
  roots!: string[];
}

@ObjectType({
  description: `Result of the native OS folder dialog: the chosen absolute server-host path, or null when the user cancelled (a clean no-op). The path may be outside the configured workspace roots — the native pick is an explicit user gesture. addWorkspaceFolder still re-validates and inspects it.`,
})
export class PickFolderNativePayloadObject {
  @Field(() => String, {
    description: `Chosen absolute path on the server host, or null on user-cancel.`,
    nullable: true,
  })
  path!: string | null;
}

@ObjectType({
  description: `Result of the addWorkspaceFolder gesture: the resolved repository, the created or relinked checkout, and the linked project when one exists.`,
})
export class AddWorkspaceFolderPayloadObject {
  @Field(() => RepositoryCheckoutObject)
  checkout!: RepositoryCheckoutObject;

  @Field(() => ProjectObject, {
    description: `Project linked at the repository level, when present.`,
    nullable: true,
  })
  project?: ProjectObject | null;

  @Field(() => Boolean, {
    description: `True when the project was auto-created by this call (new repository); false when an existing link was inherited.`,
  })
  projectCreated!: boolean;

  @Field(() => WorkspaceFolderReconciliationEnum)
  reconciliation!: WorkspaceFolderReconciliationEnum;

  @Field(() => RepositoryObject)
  repository!: RepositoryObject;
}

@ObjectType({
  description: `Drift detected by refreshCheckout, diffing the new scan against the previous snapshot.`,
})
export class CheckoutDriftObject {
  @Field(() => Boolean)
  branchMoved!: boolean;

  @Field(() => Boolean)
  pathMissing!: boolean;

  @Field(() => Boolean)
  remoteChanged!: boolean;
}

@ObjectType({
  description: `Result of refreshCheckout: the checkout with its updated snapshot, drift flags, and the (possibly merged) repository.`,
})
export class RefreshCheckoutPayloadObject {
  @Field(() => RepositoryCheckoutObject)
  checkout!: RepositoryCheckoutObject;

  @Field(() => CheckoutDriftObject)
  drift!: CheckoutDriftObject;

  @Field(() => Boolean, {
    description: `True when a provisional repository gained a remote and merged into an existing canonical repository (its checkouts re-pointed; the canonical project link won).`,
  })
  merged!: boolean;

  @Field(() => RepositoryObject, {
    description: `The checkout's repository after any promotion or merge.`,
  })
  repository!: RepositoryObject;

  @Field(() => String, {
    description: `Project link that was dropped from the provisional repository when the merge kept the canonical link.`,
    nullable: true,
  })
  supersededProjectId!: string | null;
}
