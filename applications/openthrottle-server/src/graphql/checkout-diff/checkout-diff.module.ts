/**
 * @description The `checkoutDiff` / `checkoutFileDiff` queries. CheckoutPathModule resolves a
 * checkout id to its directory with the ownership check; SourceControlModule looks up the branch's
 * pull request; RolesModule supplies RolesRepository for GqlPermissionsGuard.
 */

import { Module } from '@nestjs/common';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { CheckoutPathModule } from '../../services/checkout-path/checkout-path.module.ts';
import { SourceControlModule } from '../../services/source-control/source-control.module.ts';
import { CheckoutDiffResolver } from './checkout-diff.resolver.ts';
import { CheckoutDiffService } from './checkout-diff.service.ts';
import { CheckoutDiffGitService } from './checkout-diff-git/checkout-diff-git.service.ts';

@Module({
  imports: [CheckoutPathModule, RolesModule, SourceControlModule],
  providers: [
    CheckoutDiffGitService,
    CheckoutDiffResolver,
    CheckoutDiffService,
    GqlPermissionsGuard,
  ],
})
export class CheckoutDiffGraphqlModule {}
