/**
 * @description GraphQL resolver for the per-user skill-tag vocabulary (user-scoped).
 * The vocabulary is seeded from the platform default on first read. Only a user principal has a
 * vocabulary: a service account has no `users` row to own `user_skill_tags` rows, so every
 * operation here refuses it with a ForbiddenException rather than seeding (and failing the FK).
 * Mirrored by the
 * openthrottle-mcp list_skill_tags / add_skill_tag / rename_skill_tag / remove_skill_tag tools.
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import type { UserSkillTag } from '@openthrottle/nestjs-repositories-server';
import { SkillTagsRepository } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { assertHumanAuthPrincipal } from '../service-accounts/service-accounts.utils.ts';
import {
  SkillTagObject,
  SkillTagVocabularyResult,
} from './skill-tag.object.ts';
import {
  AddSkillTagInput,
  RemoveSkillTagInput,
  RenameSkillTagInput,
} from './skill-tags.input.ts';
import { unwrapSkillTagWriteResult } from './skill-tags.utils.ts';

@Resolver(() => SkillTagObject)
@UseGuards(GqlPermissionsGuard)
export class SkillTagsResolver {
  constructor(private readonly skillTagsRepository: SkillTagsRepository) {}

  @Query(() => SkillTagVocabularyResult, {
    description: `The authenticated user's skill-tag vocabulary. Seeded from the platform default on first read. A service-account caller is refused (FORBIDDEN).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async skillTagVocabulary(
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<SkillTagVocabularyResult> {
    const { sub: userId } = assertHumanAuthPrincipal(principal);
    const tags = await this.skillTagsRepository.listForUser(userId);
    return { tags, totalCount: tags.length };
  }

  @Mutation(() => SkillTagObject, {
    description: `Add a kebab-case tag to the authenticated user's skill-tag vocabulary. A duplicate is rejected with extensions.code SKILL_TAG_CONFLICT. A service-account caller is refused (FORBIDDEN).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async addSkillTag(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => AddSkillTagInput }) input: AddSkillTagInput,
  ): Promise<UserSkillTag> {
    const { sub: userId } = assertHumanAuthPrincipal(principal);
    const result = await this.skillTagsRepository.addTag(
      userId,
      input.tag,
      input.dimension ?? 'domain',
    );
    return unwrapSkillTagWriteResult(result);
  }

  @Mutation(() => SkillTagObject, {
    description: `Rename a tag in the authenticated user's skill-tag vocabulary. A target the user already has is rejected with extensions.code SKILL_TAG_CONFLICT. A service-account caller is refused (FORBIDDEN).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async renameSkillTag(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => RenameSkillTagInput })
    input: RenameSkillTagInput,
  ): Promise<UserSkillTag> {
    const { sub: userId } = assertHumanAuthPrincipal(principal);
    const result = await this.skillTagsRepository.renameTag(
      userId,
      input.from,
      input.to,
    );
    return unwrapSkillTagWriteResult(result);
  }

  @Mutation(() => Boolean, {
    description: `Remove a tag from the authenticated user's skill-tag vocabulary. Returns false when the tag was not present. A service-account caller is refused (FORBIDDEN).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async removeSkillTag(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => RemoveSkillTagInput })
    input: RemoveSkillTagInput,
  ): Promise<boolean> {
    const { sub: userId } = assertHumanAuthPrincipal(principal);
    return this.skillTagsRepository.removeTag(userId, input.tag);
  }
}
