import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { CmsWriteGuard } from '../cms-write-access/cms-write-access.guard.ts';
import {
  CreateCmsFragmentInput,
  UpdateCmsFragmentInput,
} from './cms-fragments.input.ts';
import { CmsFragmentObject } from './cms-fragments.object.ts';
import { CmsFragmentsService } from './cms-fragments.service.ts';

/**
 * @description cms fragment mutations. Every mutation runs `CmsWriteGuard`: a signed-in caller the
 * host authorizes for cms writes (openthrottle-server: `cms:write`).
 * @public
 */
@Resolver(() => CmsFragmentObject)
export class CmsFragmentsResolver {
  constructor(private readonly cmsFragmentsService: CmsFragmentsService) {}

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsFragmentObject, {
    description: `Create a fragment on its typename's newest ACTIVE schema, prefilled with that schema's defaults and validated against it. BAD_USER_INPUT (with extensions.issues) when invalid.`,
  })
  async createCmsFragment(
    @Args('input', { type: () => CreateCmsFragmentInput })
    input: CreateCmsFragmentInput,
  ): Promise<CmsFragmentObject> {
    return this.cmsFragmentsService.create(input);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsFragmentObject, {
    description: `Rename a fragment and/or replace its properties, validated against the fragment's pinned schema version.`,
  })
  async updateCmsFragment(
    @Args('input', { type: () => UpdateCmsFragmentInput })
    input: UpdateCmsFragmentInput,
  ): Promise<CmsFragmentObject> {
    return this.cmsFragmentsService.update(input);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsFragmentObject, {
    description: `Soft delete a fragment. CONFLICT while a live parent or layout still references it.`,
  })
  async deleteCmsFragment(
    @Args('uuid', { type: () => String }) uuid: string,
  ): Promise<CmsFragmentObject> {
    return this.cmsFragmentsService.delete(uuid);
  }
}
