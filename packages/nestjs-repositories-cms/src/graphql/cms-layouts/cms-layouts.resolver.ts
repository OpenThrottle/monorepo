import { UseGuards } from '@nestjs/common';
import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';

import { toCmsPageOptions } from '../cms-graphql/cms-graphql.utils.ts';
import { CmsWriteGuard } from '../cms-write-access/cms-write-access.guard.ts';
import { CmsWriteAccessService } from '../cms-write-access/cms-write-access.service.ts';
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
import type { CmsLayoutAudience } from './cms-layouts.types.ts';

/**
 * @description cms layouts: public reads and writes, which are not `@Public()` and so need a
 * signed-in caller. Reads show only ACTIVE layouts unless the caller may write cms content
 * (openthrottle-server: `cms:write`), who also sees DRAFT and DISABLED ones; soft-deleted
 * layouts read as missing to everyone. The host soft-authenticates `@Public()` handlers, so a
 * signed-in editor's token still reaches these reads.
 * @public
 */
@Resolver(() => CmsLayoutObject)
export class CmsLayoutsResolver {
  constructor(
    private readonly cmsLayoutsService: CmsLayoutsService,
    private readonly cmsWriteAccessService: CmsWriteAccessService,
  ) {}

  @Public()
  @Query(() => CmsLayoutListResult, {
    description: `One page of live cms layouts, without their trees: ACTIVE ones only, unless the caller may write cms content. take is clamped to 1–100 (default 25).`,
  })
  async cmsLayouts(
    @Args('skip', { nullable: true, type: () => Int }) skip: number | null,
    @Args('take', { nullable: true, type: () => Int }) take: number | null,
    @Context('req') request: unknown,
  ): Promise<CmsLayoutListResult> {
    return this.cmsLayoutsService.findPage(
      toCmsPageOptions(skip, take),
      await this.toAudience(request),
    );
  }

  @Public()
  @Query(() => CmsLayoutObject, {
    description: `A live cms layout by slug, with its fragment tree; null when none matches. A DRAFT or DISABLED layout is null unless the caller may write cms content.`,
    nullable: true,
  })
  async cmsLayout(
    @Args('slug', { type: () => String }) slug: string,
    @Context('req') request: unknown,
  ): Promise<CmsLayoutObject | null> {
    return this.cmsLayoutsService.findBySlug(
      slug,
      await this.toAudience(request),
    );
  }

  @Public()
  @Query(() => CmsLayoutObject, {
    description: `A live cms layout by uuid, with its fragment tree; null when none matches. A DRAFT or DISABLED layout is null unless the caller may write cms content.`,
    nullable: true,
  })
  async cmsLayoutByUuid(
    @Args('uuid', { type: () => String }) uuid: string,
    @Context('req') request: unknown,
  ): Promise<CmsLayoutObject | null> {
    return this.cmsLayoutsService.findByUuid(
      uuid,
      await this.toAudience(request),
    );
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

  private async toAudience(request: unknown): Promise<CmsLayoutAudience> {
    const canWrite = await this.cmsWriteAccessService.canWrite(request);

    return canWrite ? 'editor' : 'public';
  }
}
