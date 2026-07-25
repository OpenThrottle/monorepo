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
  @Field(() => String)
  name!: string;

  @Field(() => String)
  path!: string;
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
