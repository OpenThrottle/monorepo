import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';

import {
  parseCmsStatus,
  toCmsPageOptions,
} from '../cms-graphql/cms-graphql.utils.ts';
import { CmsSchemaListResult, CmsSchemaObject } from './cms-schemas.object.ts';
import { CmsSchemasService } from './cms-schemas.service.ts';

/**
 * @description Public read queries for cms schemas.
 * @public
 */
@Public()
@Resolver(() => CmsSchemaObject)
export class CmsSchemasResolver {
  constructor(private readonly cmsSchemasService: CmsSchemasService) {}

  @Query(() => CmsSchemaListResult, {
    description: `One page of live cms schemas, optionally filtered by status (ACTIVE | DISABLED | DRAFT) and typename. take is clamped to 1–100 (default 25).`,
  })
  async cmsSchemas(
    @Args('skip', { nullable: true, type: () => Int }) skip: number | null,
    @Args('status', { nullable: true, type: () => String })
    status: string | null,
    @Args('take', { nullable: true, type: () => Int }) take: number | null,
    @Args('typename', { nullable: true, type: () => String })
    typename: string | null,
  ): Promise<CmsSchemaListResult> {
    return this.cmsSchemasService.findPage({
      ...toCmsPageOptions(skip, take),
      status: parseCmsStatus(status),
      typename: typename ?? null,
    });
  }

  @Query(() => CmsSchemaObject, {
    description: `A live cms schema by uuid; null when none matches.`,
    nullable: true,
  })
  async cmsSchema(
    @Args('uuid', { type: () => String }) uuid: string,
  ): Promise<CmsSchemaObject | null> {
    return this.cmsSchemasService.findByUuid(uuid);
  }

  @Query(() => CmsSchemaObject, {
    description: `The live cms schema for a typename at a version; without a version, its newest ACTIVE version. Null when none matches.`,
    nullable: true,
  })
  async cmsSchemaByTypename(
    @Args('typename', { type: () => String }) typename: string,
    @Args('version', { nullable: true, type: () => String })
    version: string | null,
  ): Promise<CmsSchemaObject | null> {
    return this.cmsSchemasService.findByTypename(typename, version ?? null);
  }
}
