import { UseGuards } from '@nestjs/common';
import {
  Args,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';

import { toCmsPageOptions } from '../cms-graphql/cms-graphql.utils.ts';
import { CmsSchemaObject } from '../cms-schemas/cms-schemas.object.ts';
import { CmsWriteGuard } from '../cms-write-access/cms-write-access.guard.ts';
import {
  CloneCmsFragmentInput,
  CreateCmsFragmentInput,
  UpdateCmsFragmentInput,
} from './cms-fragments.input.ts';
import {
  CmsFragmentListResult,
  CmsFragmentObject,
} from './cms-fragments.object.ts';
import { CmsFragmentsService } from './cms-fragments.service.ts';

/**
 * @description cms fragments: a public list, and mutations that each run `CmsWriteGuard` (a
 * signed-in caller the host authorizes for cms writes; openthrottle-server: `cms:write`).
 * @public
 */
@Resolver(() => CmsFragmentObject)
export class CmsFragmentsResolver {
  constructor(private readonly cmsFragmentsService: CmsFragmentsService) {}

  @Public()
  @Query(() => CmsFragmentListResult, {
    description: `One page of live cms fragments, oldest first, optionally narrowed by typename and isSystem (false also matches an unset flag). take is clamped to 1–100 (default 25).`,
  })
  async cmsFragments(
    @Args('typename', { nullable: true, type: () => String })
    typename: string | null,
    @Args('isSystem', { nullable: true, type: () => Boolean })
    isSystem: boolean | null,
    @Args('skip', { nullable: true, type: () => Int }) skip: number | null,
    @Args('take', { nullable: true, type: () => Int }) take: number | null,
  ): Promise<CmsFragmentListResult> {
    return this.cmsFragmentsService.findPage({
      ...toCmsPageOptions(skip, take),
      isSystem: isSystem ?? null,
      typename: typename ?? null,
    });
  }

  @Public()
  @Query(() => CmsFragmentObject, {
    description: `A live cms fragment by uuid; null when none matches.`,
    nullable: true,
  })
  async cmsFragment(
    @Args('uuid', { type: () => String }) uuid: string,
  ): Promise<CmsFragmentObject | null> {
    return this.cmsFragmentsService.findByUuid(uuid);
  }

  @ResolveField('children', () => [CmsFragmentObject], {
    description: `The fragment's live children in sortOrder. One query per fragment: select it on a single fragment, not across a list (the layout tree is cmsLayout's job).`,
  })
  async children(
    @Parent() fragment: CmsFragmentObject,
  ): Promise<CmsFragmentObject[]> {
    return this.cmsFragmentsService.findChildren(fragment.uuid);
  }

  @ResolveField('schema', () => CmsSchemaObject, {
    description: `The schema version this fragment is pinned to, even when that version has since been soft-deleted; null only when the row is gone. One query per fragment: select it on a single fragment, not across a list.`,
    nullable: true,
  })
  async schema(
    @Parent() fragment: CmsFragmentObject,
  ): Promise<CmsSchemaObject | null> {
    return this.cmsFragmentsService.findPinnedSchema(fragment.schemaUuid);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsFragmentObject, {
    description: `Copy a live fragment on its pinned schema version, optionally with a fresh copy of its live subtree, in one transaction. The copy has no parent. BAD_USER_INPUT when the subtree is past the tree cap.`,
  })
  async cloneCmsFragment(
    @Args('input', { type: () => CloneCmsFragmentInput })
    input: CloneCmsFragmentInput,
  ): Promise<CmsFragmentObject> {
    return this.cmsFragmentsService.clone(input);
  }

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
