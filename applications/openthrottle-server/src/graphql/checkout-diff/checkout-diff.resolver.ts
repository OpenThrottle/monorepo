/**
 * @description GraphQL resolver for the checkout diff. Both queries take a registered checkout id
 * and scope it to the current user; there is no path argument for a checkout.
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import {
  CheckoutDiffObject,
  CheckoutFileDiffObject,
} from './checkout-diff.object.ts';
import { CheckoutDiffService } from './checkout-diff.service.ts';

@Resolver(() => CheckoutDiffObject)
@UseGuards(GqlPermissionsGuard)
export class CheckoutDiffResolver {
  constructor(private readonly checkoutDiffService: CheckoutDiffService) {}

  @Query(() => CheckoutDiffObject, {
    description: `A checkout's changes against its base branch (merge-base with the default branch, including uncommitted and untracked files): per-file status and +/- counts, totals and the branch's pull request. Expected failures come back as available: false with a reason.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  checkoutDiff(
    @CurrentUser('sub') userId: string,
    @Args('checkoutId', { type: () => ID }) checkoutId: string,
  ): Promise<CheckoutDiffObject> {
    return this.checkoutDiffService.diff(userId, checkoutId);
  }

  @Query(() => CheckoutFileDiffObject, {
    description: `The unified patch of one file of checkoutDiff, capped at 200 KB. The path must be one of the diff's paths.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  checkoutFileDiff(
    @CurrentUser('sub') userId: string,
    @Args('checkoutId', { type: () => ID }) checkoutId: string,
    @Args('path', { type: () => String }) path: string,
  ): Promise<CheckoutFileDiffObject> {
    return this.checkoutDiffService.fileDiff(userId, checkoutId, path);
  }
}
