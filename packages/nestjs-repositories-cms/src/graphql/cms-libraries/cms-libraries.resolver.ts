import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';

import { toCmsPageOptions } from '../cms-graphql/cms-graphql.utils.ts';
import { CmsLibraryListResult } from './cms-libraries.object.ts';
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
    description: `One page of live cms libraries with their components. take is clamped to 1–100 (default 25).`,
  })
  async cmsLibraries(
    @Args('skip', { nullable: true, type: () => Int }) skip: number | null,
    @Args('take', { nullable: true, type: () => Int }) take: number | null,
  ): Promise<CmsLibraryListResult> {
    return this.cmsLibrariesService.findPage(toCmsPageOptions(skip, take));
  }
}
