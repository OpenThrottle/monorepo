import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';

import { toCmsPageOptions } from '../cms-graphql/cms-graphql.utils.ts';
import { CmsWriteGuard } from '../cms-write-access/cms-write-access.guard.ts';
import {
  CreateCmsLayoutInput,
  UpdateCmsLayoutInput,
} from './cms-layouts.input.ts';
import {
  CmsLayoutListResult,
  CmsLayoutObject,
  CmsLayoutSummaryObject,
} from './cms-layouts.object.ts';
import { CmsLayoutsService } from './cms-layouts.service.ts';

/**
 * @description cms layouts: public reads (soft-deleted layouts read as null) and writes, which
 * are not `@Public()` and so need a signed-in caller.
 * @public
 */
@Resolver(() => CmsLayoutObject)
export class CmsLayoutsResolver {
  constructor(private readonly cmsLayoutsService: CmsLayoutsService) {}

  @Public()
  @Query(() => CmsLayoutListResult, {
    description: `One page of live cms layouts, without their trees. take is clamped to 1–100 (default 25).`,
  })
  async cmsLayouts(
    @Args('skip', { nullable: true, type: () => Int }) skip: number | null,
    @Args('take', { nullable: true, type: () => Int }) take: number | null,
  ): Promise<CmsLayoutListResult> {
    return this.cmsLayoutsService.findPage(toCmsPageOptions(skip, take));
  }

  @Public()
  @Query(() => CmsLayoutObject, {
    description: `A live cms layout by slug, with its fragment tree; null when none matches.`,
    nullable: true,
  })
  async cmsLayout(
    @Args('slug', { type: () => String }) slug: string,
  ): Promise<CmsLayoutObject | null> {
    return this.cmsLayoutsService.findBySlug(slug);
  }

  @Public()
  @Query(() => CmsLayoutObject, {
    description: `A live cms layout by uuid, with its fragment tree; null when none matches.`,
    nullable: true,
  })
  async cmsLayoutByUuid(
    @Args('uuid', { type: () => String }) uuid: string,
  ): Promise<CmsLayoutObject | null> {
    return this.cmsLayoutsService.findByUuid(uuid);
  }

  @Public()
  @Query(() => [String], {
    description: `Typenames an editor can add to a live layout: every live ACTIVE schema typename except the root "Layout", sorted. NOT_FOUND when the layout is missing or deleted.`,
  })
  async availableCmsTypenames(
    @Args('layoutUuid', { type: () => String }) layoutUuid: string,
  ): Promise<string[]> {
    return this.cmsLayoutsService.findAvailableTypenames(layoutUuid);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsLayoutSummaryObject, {
    description: `Create a layout and its root fragment in one transaction. CONFLICT for a slug in use.`,
  })
  async createCmsLayout(
    @Args('input', { type: () => CreateCmsLayoutInput })
    input: CreateCmsLayoutInput,
  ): Promise<CmsLayoutSummaryObject> {
    return this.cmsLayoutsService.create(input);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsLayoutSummaryObject, {
    description: `Change a layout's name, slug, status, tags or metadata.`,
  })
  async updateCmsLayout(
    @Args('input', { type: () => UpdateCmsLayoutInput })
    input: UpdateCmsLayoutInput,
  ): Promise<CmsLayoutSummaryObject> {
    return this.cmsLayoutsService.update(input);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsLayoutSummaryObject, {
    description: `Soft delete a layout and its root fragment together.`,
  })
  async deleteCmsLayout(
    @Args('uuid', { type: () => String }) uuid: string,
  ): Promise<CmsLayoutSummaryObject> {
    return this.cmsLayoutsService.delete(uuid);
  }
}
