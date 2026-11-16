import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { GitTextDraftInput } from './git-text.input.ts';
import { GitTextDraftObject } from './git-text.object.ts';
import { GitTextService } from './git-text.service.ts';

@Resolver(() => GitTextDraftObject)
@UseGuards(GqlPermissionsGuard)
export class GitTextResolver {
  constructor(private readonly gitTextService: GitTextService) {}

  @Query(() => GitTextDraftObject, {
    description: `Draft a branch name, a task's commit message and the PR title and body for a plan, from its OT data. Conventional commits, the repo PR template, Plan-Id / Task-Id footers, no tool or model credit.`,
  })
  @Permissions(PERMISSIONS.PLANS_READ)
  gitTextDraft(
    @Args('input', { type: () => GitTextDraftInput })
    input: GitTextDraftInput,
  ): Promise<GitTextDraftObject> {
    return this.gitTextService.draft(input);
  }
}
