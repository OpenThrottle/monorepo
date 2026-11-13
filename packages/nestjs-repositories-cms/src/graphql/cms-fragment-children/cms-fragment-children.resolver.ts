import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Resolver } from '@nestjs/graphql';

import { CmsWriteGuard } from '../cms-write-access/cms-write-access.guard.ts';
import { CmsFragmentChildObject } from './cms-fragment-children.object.ts';
import { CmsFragmentChildrenService } from './cms-fragment-children.service.ts';

/**
 * @description Mutations on the cms fragment tree's edges. Every mutation runs `CmsWriteGuard` (host-authorized cms writes).
 * @public
 */
@Resolver(() => CmsFragmentChildObject)
export class CmsFragmentChildrenResolver {
  constructor(
    private readonly cmsFragmentChildrenService: CmsFragmentChildrenService,
  ) {}

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsFragmentChildObject, {
    description: `Add a child under a parent fragment, at sortOrder or last. BAD_USER_INPUT for a cycle or a tree deeper than 10; CONFLICT if the edge exists.`,
  })
  async addCmsFragmentChild(
    @Args('childUuid', { type: () => String }) childUuid: string,
    @Args('parentUuid', { type: () => String }) parentUuid: string,
    @Args('sortOrder', { nullable: true, type: () => Int })
    sortOrder: number | null,
  ): Promise<CmsFragmentChildObject> {
    return this.cmsFragmentChildrenService.add(
      parentUuid,
      childUuid,
      sortOrder ?? null,
    );
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => CmsFragmentChildObject, {
    description: `Remove a child from a parent fragment. The child fragment itself is kept.`,
  })
  async removeCmsFragmentChild(
    @Args('childUuid', { type: () => String }) childUuid: string,
    @Args('parentUuid', { type: () => String }) parentUuid: string,
  ): Promise<CmsFragmentChildObject> {
    return this.cmsFragmentChildrenService.remove(parentUuid, childUuid);
  }

  @UseGuards(CmsWriteGuard)
  @Mutation(() => [CmsFragmentChildObject], {
    description: `Reorder a parent's children. childUuids must list exactly the current children.`,
  })
  async reorderCmsFragmentChildren(
    @Args('childUuids', { type: () => [String] }) childUuids: string[],
    @Args('parentUuid', { type: () => String }) parentUuid: string,
  ): Promise<CmsFragmentChildObject[]> {
    return this.cmsFragmentChildrenService.reorder(parentUuid, childUuids);
  }
}
