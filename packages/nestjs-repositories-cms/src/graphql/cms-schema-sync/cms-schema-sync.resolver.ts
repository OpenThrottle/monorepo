import { UseGuards } from '@nestjs/common';
import { Mutation, Resolver } from '@nestjs/graphql';

import { createCmsGraphqlError } from '../cms-graphql/cms-graphql.utils.ts';
import { CmsWriteGuard } from '../cms-write-access/cms-write-access.guard.ts';
import { CmsSchemaSyncResultObject } from './cms-schema-sync.object.ts';
import { CmsSchemaSyncService } from './cms-schema-sync.service.ts';

/**
 * @description The on-demand cms schema sync, for retrying a failed boot sync or picking up a
 * rebuilt package without a restart. Runs `CmsWriteGuard` (host-authorized cms writes).
 * @public
 */
@Resolver(() => CmsSchemaSyncResultObject)
export class CmsSchemaSyncResolver {
  constructor(private readonly cmsSchemaSyncService: CmsSchemaSyncService) {}

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsSchemaSyncResultObject, {
    description: `Sync the generated block schemas into the cms schemas table, the same sync the server runs on boot. Append-only and idempotent. CMS_SCHEMA_SYNC_FAILED when the manifests are missing or stale or the write fails.`,
  })
  async syncCmsSchemas(): Promise<CmsSchemaSyncResultObject> {
    const outcome = await this.cmsSchemaSyncService.sync();

    if (!outcome.ok) {
      throw createCmsGraphqlError('CMS_SCHEMA_SYNC_FAILED', outcome.error);
    }

    return {
      activated: [...outcome.result.activated],
      disabled: [...outcome.result.disabled],
      inserted: [...outcome.result.inserted],
      total: outcome.result.total,
    };
  }
}
