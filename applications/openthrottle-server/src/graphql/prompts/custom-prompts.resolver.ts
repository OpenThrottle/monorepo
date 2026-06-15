/**
 * @description Resolver for CustomPrompt queries and mutations. Includes file system persistence capability.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { CustomPrompt } from '@openthrottle/nestjs-repositories';
import { CustomPromptsService } from '@openthrottle/nestjs-repositories';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import { IsNull } from 'typeorm';
import {
  CreateCustomPromptInput,
  ListCustomPromptsInput,
  UpdateCustomPromptInput,
} from './custom-prompt.input';
import { CustomPromptObject } from './custom-prompt.object';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => CustomPromptObject)
export class CustomPromptsResolver {
  constructor(
    private readonly configService: ConfigService,
    private readonly customPromptsService: CustomPromptsService,
  ) {}

  @Query(() => CustomPromptObject, {
    description: 'Get a custom prompt by ID',
    nullable: true,
  })
  async customPrompt(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CustomPrompt | null> {
    const entity = await this.customPromptsService
      .getRepository()
      .findOne({ where: { deletedAt: IsNull(), id } });

    return entity;
  }

  @Query(() => [CustomPromptObject], {
    description: 'List custom prompts with optional filters',
  })
  async customPrompts(
    @Args('input', { nullable: true, type: () => ListCustomPromptsInput })
    input?: ListCustomPromptsInput,
  ): Promise<CustomPrompt[]> {
    const repo = this.customPromptsService.getRepository();
    const qb = repo.createQueryBuilder('cp');

    if (!input?.includeDeleted) {
      qb.andWhere('cp.deleted_at IS NULL');
    }

    if (input?.promptType) {
      qb.andWhere('cp.prompt_type = :promptType', {
        promptType: input.promptType,
      });
    }

    if (input?.labels && input.labels.length > 0) {
      qb.andWhere('cp.labels ?| :labels', { labels: input.labels });
    }

    if (input?.search) {
      qb.andWhere('cp.title ILIKE :search', { search: `%${input.search}%` });
    }

    if (input?.projectId) {
      qb.andWhere('cp.project_id = :projectId', { projectId: input.projectId });
    }

    if (input?.userId) {
      qb.andWhere('cp.user_id = :userId', { userId: input.userId });
    }

    qb.orderBy('cp.created_at', 'DESC');

    return qb.getMany();
  }

  @Mutation(() => CustomPromptObject, {
    description: 'Create a new custom prompt',
  })
  async createCustomPrompt(
    @Args('input', { type: () => CreateCustomPromptInput })
    input: CreateCustomPromptInput,
  ): Promise<CustomPrompt> {
    const repo = this.customPromptsService.getRepository();

    const entity = repo.create({
      content: input.content,
      description: input.description,
      filePath: input.filePath,
      labels: input.labels ?? [],
      projectId: input.projectId,
      promptType: input.promptType,
      title: input.title,
      userId: input.userId,
    });

    const saved = await repo.save(entity);

    if (input.writeToFileSystem && input.filePath) {
      await this.writeToFileSystem(input.filePath, input.content);
    }

    return saved;
  }

  @Mutation(() => CustomPromptObject, {
    description: 'Update an existing custom prompt',
    nullable: true,
  })
  async updateCustomPrompt(
    @Args('input', { type: () => UpdateCustomPromptInput })
    input: UpdateCustomPromptInput,
  ): Promise<CustomPrompt | null> {
    const repo = this.customPromptsService.getRepository();
    const entity = await repo.findOne({
      where: { deletedAt: IsNull(), id: input.id },
    });

    if (!entity) return null;

    if (input.title != null) entity.title = input.title;
    if (input.content != null) entity.content = input.content;
    if (input.description !== undefined) entity.description = input.description;
    if (input.promptType != null) entity.promptType = input.promptType;
    if (input.labels != null) entity.labels = input.labels;
    if (input.filePath !== undefined) entity.filePath = input.filePath;
    if (input.userId !== undefined) entity.userId = input.userId;
    if (input.projectId !== undefined) entity.projectId = input.projectId;

    const saved = await repo.save(entity);

    const filePathToWrite = input.filePath ?? entity.filePath;
    const contentToWrite = input.content ?? entity.content;

    if (input.writeToFileSystem && filePathToWrite) {
      await this.writeToFileSystem(filePathToWrite, contentToWrite);
    }

    return saved;
  }

  @Mutation(() => Boolean, {
    description: 'Soft delete a custom prompt by ID',
  })
  async deleteCustomPrompt(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const repo = this.customPromptsService.getRepository();
    const entity = await repo.findOne({
      where: { deletedAt: IsNull(), id },
    });

    if (!entity) return false;

    entity.deletedAt = new Date();
    await repo.save(entity);

    return true;
  }

  @Mutation(() => Boolean, {
    description: 'Permanently delete a custom prompt by ID',
  })
  async hardDeleteCustomPrompt(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const repo = this.customPromptsService.getRepository();
    const result = await repo.delete({ id });

    return (result.affected ?? 0) > 0;
  }

  @Mutation(() => CustomPromptObject, {
    description: 'Restore a soft-deleted custom prompt',
    nullable: true,
  })
  async restoreCustomPrompt(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CustomPrompt | null> {
    const repo = this.customPromptsService.getRepository();
    const entity = await repo.findOne({ where: { id } });

    if (!entity || !entity.deletedAt) return null;

    entity.deletedAt = null;
    const saved = await repo.save(entity);

    return saved;
  }

  @Mutation(() => Boolean, {
    description:
      'Write a custom prompt to the file system at its configured filePath',
  })
  async writeCustomPromptToFileSystem(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const repo = this.customPromptsService.getRepository();
    const entity = await repo.findOne({
      where: { deletedAt: IsNull(), id },
    });

    if (!entity || !entity.filePath) return false;

    await this.writeToFileSystem(entity.filePath, entity.content);

    return true;
  }

  /**
   * @description Write content to file system at the specified path relative to workspace root.
   */
  private async writeToFileSystem(
    filePath: string,
    content: string,
  ): Promise<void> {
    const workspaceRoot =
      this.configService.get<string>('WORKSPACE_ROOT') || process.cwd();
    const absolutePath = path.resolve(workspaceRoot, filePath);

    const dir = path.dirname(absolutePath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(absolutePath, content, 'utf-8');
  }
}
