import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';

import { toCmsPageOptions } from '../cms-graphql/cms-graphql.utils.ts';
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
    description: `One page of live cms library components across every library, by typename. take is clamped to 1–100 (default 25).`,
  })
  async cmsLibraryComponents(
    @Args('skip', { nullable: true, type: () => Int }) skip: number | null,
    @Args('take', { nullable: true, type: () => Int }) take: number | null,
  ): Promise<CmsLibraryComponentListResult> {
    return this.cmsLibraryComponentsService.findPage(
      toCmsPageOptions(skip, take),
    );
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
