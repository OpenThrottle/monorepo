/**
 * @description Resolver for CustomPrompt queries and mutations, including the
 * opt-in filesystem persistence of a prompt's content to its `filePath`.
 *
 * Security posture: `filePath` is client-supplied, so writing it is treated as
 * privileged. Every write goes through {@link resolveCustomPromptWritePath}
 * (workspace-relative, no `..`, realpath-contained under the workspace root,
 * and never a SKILL.md) AND requires the SETTINGS_WRITE permission. The
 * permission and the path policy are both checked BEFORE the row is saved, so a
 * refused write never leaves a half-applied mutation or creates a directory.
 * DB-only create/update (the default, `writeToFileSystem: false`) is unchanged
 * and stays authenticated-only.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { CustomPrompt } from '@openthrottle/nestjs-repositories';
import {
  CustomPromptsService,
  RolesService,
} from '@openthrottle/nestjs-repositories';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ConfigService } from '@nestjs/config';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  type AuthPrincipal,
  CurrentUser,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import { IsNull } from 'typeorm';
import { resolveCustomPromptWritePath } from './custom-prompt-write-path';
import {
  CreateCustomPromptInput,
  ListCustomPromptsInput,
  UpdateCustomPromptInput,
} from './custom-prompt.input';
import { CustomPromptObject } from './custom-prompt.object';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
// for the queries and DB-only mutations; any filesystem write additionally
// requires SETTINGS_WRITE, checked in-body because only the opt-in write branch
// is privileged.
@Resolver(() => CustomPromptObject)
export class CustomPromptsResolver {
  constructor(
    private readonly configService: ConfigService,
    private readonly customPromptsService: CustomPromptsService,
    private readonly rolesService: RolesService,
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
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => CreateCustomPromptInput })
    input: CreateCustomPromptInput,
  ): Promise<CustomPrompt> {
    const repo = this.customPromptsService.getRepository();

    // Gate BEFORE the save so a refused write never persists a row.
    const writeTarget =
      input.writeToFileSystem && input.filePath
        ? await this.resolveWriteTarget(principal, input.filePath)
        : null;

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

    if (writeTarget != null) {
      await this.writeToFileSystem(writeTarget, input.content);
    }

    return saved;
  }

  @Mutation(() => CustomPromptObject, {
    description: 'Update an existing custom prompt',
    nullable: true,
  })
  async updateCustomPrompt(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => UpdateCustomPromptInput })
    input: UpdateCustomPromptInput,
  ): Promise<CustomPrompt | null> {
    const repo = this.customPromptsService.getRepository();
    const entity = await repo.findOne({
      where: { deletedAt: IsNull(), id: input.id },
    });

    if (!entity) return null;

    // Gate BEFORE the save so a refused write never persists the edit.
    const filePathToWrite = input.filePath ?? entity.filePath;
    const writeTarget =
      input.writeToFileSystem && filePathToWrite
        ? await this.resolveWriteTarget(principal, filePathToWrite)
        : null;

    if (input.title != null) entity.title = input.title;
    if (input.content != null) entity.content = input.content;
    if (input.description !== undefined) entity.description = input.description;
    if (input.promptType != null) entity.promptType = input.promptType;
    if (input.labels != null) entity.labels = input.labels;
    if (input.filePath !== undefined) entity.filePath = input.filePath;
    if (input.userId !== undefined) entity.userId = input.userId;
    if (input.projectId !== undefined) entity.projectId = input.projectId;

    const saved = await repo.save(entity);

    if (writeTarget != null) {
      await this.writeToFileSystem(
        writeTarget,
        input.content ?? entity.content,
      );
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
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const repo = this.customPromptsService.getRepository();
    const entity = await repo.findOne({
      where: { deletedAt: IsNull(), id },
    });

    if (!entity || !entity.filePath) return false;

    const writeTarget = await this.resolveWriteTarget(
      principal,
      entity.filePath,
    );
    await this.writeToFileSystem(writeTarget, entity.content);

    return true;
  }

  /**
   * @description Authorizes a filesystem write and resolves the client-supplied
   * `filePath` to a vetted absolute path. Throws `ForbiddenException` without
   * SETTINGS_WRITE and `BadRequestException` when the path policy refuses.
   * Nothing touches disk here.
   */
  private async resolveWriteTarget(
    principal: AuthPrincipal | undefined,
    filePath: string,
  ): Promise<string> {
    if (principal == null) {
      throw new ForbiddenException(
        'An authenticated user is required to write a prompt to the file system.',
      );
    }

    const permissions =
      principal.kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT
        ? await this.rolesService.getPermissionsForServiceAccount(principal.sub)
        : await this.rolesService.getPermissionsForUser(principal.sub);

    if (!permissions.includes(PERMISSIONS.SETTINGS_WRITE)) {
      throw new ForbiddenException(
        `Missing permission: ${PERMISSIONS.SETTINGS_WRITE}. Writing a prompt to the file system requires it.`,
      );
    }

    const workspaceRoot =
      this.configService.get<string>('WORKSPACE_ROOT') || process.cwd();
    const resolved = resolveCustomPromptWritePath(workspaceRoot, filePath);

    if (!resolved.ok) {
      throw new BadRequestException(resolved.reason);
    }

    return resolved.absolutePath;
  }

  /**
   * @description Writes content to an ALREADY vetted absolute path — callers
   * must pass the output of {@link resolveWriteTarget}, never a raw client
   * `filePath`, so the containment guard can never be skipped.
   */
  private async writeToFileSystem(
    absolutePath: string,
    content: string,
  ): Promise<void> {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf-8');
  }
}
