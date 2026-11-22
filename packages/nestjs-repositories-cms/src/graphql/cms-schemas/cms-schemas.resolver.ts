import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from '@openthrottle/nestjs-postgres';

import {
  parseCmsStatus,
  resolveCmsPageOptions,
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
    description: `One page of live cms schemas, optionally filtered by status (ACTIVE | DISABLED | DRAFT) and typename. limit is 1 to 100 (default 25).`,
  })
  async cmsSchemas(
    @Args('limit', {
      description: `Page size, 1 to ${PAGINATION_MAX_LIMIT} (default ${PAGINATION_DEFAULT_LIMIT}).`,
      nullable: true,
      type: () => Int,
    })
    limit: number | null,
    @Args('offset', {
      description: `Rows to skip, 0 or more.`,
      nullable: true,
      type: () => Int,
    })
    offset: number | null,
    @Args('status', { nullable: true, type: () => String })
    status: string | null,
    @Args('typename', { nullable: true, type: () => String })
    typename: string | null,
  ): Promise<CmsSchemaListResult> {
    return this.cmsSchemasService.findPage({
      ...resolveCmsPageOptions({ limit, offset }),
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
