/**
 * @description GraphQL resolver for the per-user skill-tag vocabulary (user-scoped).
 * The vocabulary is seeded from the platform default on first read. Mirrored by the
 * openthrottle-mcp list_skill_tags / add_skill_tag / rename_skill_tag / remove_skill_tag tools.
 */

import type { UserSkillTag } from '@openthrottle/nestjs-repositories';
import { SkillTagsService } from '@openthrottle/nestjs-repositories';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import {
  AddSkillTagInput,
  RemoveSkillTagInput,
  RenameSkillTagInput,
} from './skill-tags.input';
import { SkillTagObject, SkillTagVocabularyResult } from './skill-tag.object';

@Resolver(() => SkillTagObject)
@UseGuards(GqlPermissionsGuard)
export class SkillTagsResolver {
  constructor(private readonly skillTagsService: SkillTagsService) {}

  @Query(() => SkillTagVocabularyResult, {
    description: `The authenticated user's skill-tag vocabulary. Seeded from the platform default on first read.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async skillTagVocabulary(
    @CurrentUser('sub') userId: string,
  ): Promise<SkillTagVocabularyResult> {
    const tags = await this.skillTagsService.listForUser(userId);
    return { tags, totalCount: tags.length };
  }

  @Mutation(() => SkillTagObject, {
    description: `Add a kebab-case tag to the authenticated user's skill-tag vocabulary.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async addSkillTag(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => AddSkillTagInput }) input: AddSkillTagInput,
  ): Promise<UserSkillTag> {
    return this.skillTagsService.addTag(userId, input.tag);
  }

  @Mutation(() => SkillTagObject, {
    description: `Rename a tag in the authenticated user's skill-tag vocabulary.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async renameSkillTag(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => RenameSkillTagInput })
    input: RenameSkillTagInput,
  ): Promise<UserSkillTag> {
    return this.skillTagsService.renameTag(userId, input.from, input.to);
  }

  @Mutation(() => Boolean, {
    description: `Remove a tag from the authenticated user's skill-tag vocabulary. Returns false when the tag was not present.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async removeSkillTag(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => RemoveSkillTagInput })
    input: RemoveSkillTagInput,
  ): Promise<boolean> {
    return this.skillTagsService.removeTag(userId, input.tag);
  }
}
