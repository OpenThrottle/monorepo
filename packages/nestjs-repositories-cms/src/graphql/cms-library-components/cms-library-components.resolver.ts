import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { CmsLibraryComponentObject } from '../cms-libraries/cms-libraries.object.ts';
import { CmsWriteGuard } from '../cms-write-access/cms-write-access.guard.ts';
import {
  CreateCmsLibraryComponentInput,
  UpdateCmsLibraryComponentInput,
} from './cms-library-components.input.ts';
import { CmsLibraryComponentsService } from './cms-library-components.service.ts';

/**
 * @description cms library-component mutations. Every mutation runs `CmsWriteGuard` (host-authorized cms writes).
 * @public
 */
@Resolver(() => CmsLibraryComponentObject)
export class CmsLibraryComponentsResolver {
  constructor(
    private readonly cmsLibraryComponentsService: CmsLibraryComponentsService,
  ) {}

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
