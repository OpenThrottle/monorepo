import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';
import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from '@openthrottle/nestjs-postgres';

import { resolveCmsPageOptions } from '../cms-graphql/cms-graphql.utils.ts';
import {
  CmsLibraryComponentListResult,
  CmsLibraryComponentObject,
} from '../cms-libraries/cms-libraries.object.ts';
import { CmsWriteGuard } from '../cms-write-access/cms-write-access.guard.ts';
import {
  CreateCmsLibraryComponentInput,
  UpdateCmsLibraryComponentInput,
} from './cms-library-components.input.ts';
import { CmsLibraryComponentsService } from './cms-library-components.service.ts';

/**
 * @description cms library components: a public paged read, and mutations. Every mutation runs `CmsWriteGuard` (host-authorized cms writes).
 * @public
 */
@Resolver(() => CmsLibraryComponentObject)
export class CmsLibraryComponentsResolver {
  constructor(
    private readonly cmsLibraryComponentsService: CmsLibraryComponentsService,
  ) {}

  @Public()
  @Query(() => CmsLibraryComponentListResult, {
    description: `One page of live cms library components across every library, by typename. limit is 1 to 100 (default 25); take and skip are deprecated aliases of limit and offset.`,
  })
  async cmsLibraryComponents(
    @Args('limit', {
      description: `Page size, 1 to ${PAGINATION_MAX_LIMIT} (default ${PAGINATION_DEFAULT_LIMIT}). Replaces take.`,
      nullable: true,
      type: () => Int,
    })
    limit: number | null,
    @Args('offset', {
      description: `Rows to skip, 0 or more. Replaces skip.`,
      nullable: true,
      type: () => Int,
    })
    offset: number | null,
    @Args('skip', {
      deprecationReason: `Use offset`,
      nullable: true,
      type: () => Int,
    })
    skip: number | null,
    @Args('take', {
      deprecationReason: `Use limit`,
      nullable: true,
      type: () => Int,
    })
    take: number | null,
  ): Promise<CmsLibraryComponentListResult> {
    return this.cmsLibraryComponentsService.findPage(
      resolveCmsPageOptions({ limit, offset, skip, take }),
    );
  }

  @Public()
  @Query(() => CmsLibraryComponentObject, {
    description: `A live cms library component by uuid; null when none matches.`,
    nullable: true,
  })
  async cmsLibraryComponent(
    @Args('uuid', { type: () => String }) uuid: string,
  ): Promise<CmsLibraryComponentObject | null> {
    return this.cmsLibraryComponentsService.findByUuid(uuid);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsLibraryComponentObject, {
    description: `Add a component to a live library. BAD_USER_INPUT when propsSchemaJson does not compile.`,
  })
  async createCmsLibraryComponent(
    @Args('input', { type: () => CreateCmsLibraryComponentInput })
    input: CreateCmsLibraryComponentInput,
  ): Promise<CmsLibraryComponentObject> {
    return this.cmsLibraryComponentsService.create(input);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsLibraryComponentObject, {
    description: `Change a library component.`,
  })
  async updateCmsLibraryComponent(
    @Args('input', { type: () => UpdateCmsLibraryComponentInput })
    input: UpdateCmsLibraryComponentInput,
  ): Promise<CmsLibraryComponentObject> {
    return this.cmsLibraryComponentsService.update(input);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsLibraryComponentObject, {
    description: `Soft delete a library component.`,
  })
  async deleteCmsLibraryComponent(
    @Args('uuid', { type: () => String }) uuid: string,
  ): Promise<CmsLibraryComponentObject> {
    return this.cmsLibraryComponentsService.delete(uuid);
  }
}
