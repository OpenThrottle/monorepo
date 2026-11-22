import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from '@openthrottle/nestjs-postgres';

import { resolveCmsPageOptions } from '../cms-graphql/cms-graphql.utils.ts';
import {
  CmsLibraryListResult,
  CmsLibraryObject,
} from './cms-libraries.object.ts';
import { CmsLibrariesService } from './cms-libraries.service.ts';

/**
 * @description Public read queries for cms component libraries.
 * @public
 */
@Public()
@Resolver()
export class CmsLibrariesResolver {
  constructor(private readonly cmsLibrariesService: CmsLibrariesService) {}

  @Query(() => CmsLibraryListResult, {
    description: `One page of live cms libraries with their components. limit is 1 to 100 (default 25).`,
  })
  async cmsLibraries(
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
  ): Promise<CmsLibraryListResult> {
    return this.cmsLibrariesService.findPage(
      resolveCmsPageOptions({ limit, offset }),
    );
  }

  @Query(() => CmsLibraryObject, {
    description: `A live cms library by uuid, with its components; null when none matches.`,
    nullable: true,
  })
  async cmsLibrary(
    @Args('uuid', { type: () => String }) uuid: string,
  ): Promise<CmsLibraryObject | null> {
    return this.cmsLibrariesService.findByUuid(uuid);
  }
}
