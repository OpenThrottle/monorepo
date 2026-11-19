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
import { ConfigService } from '@nestjs/config';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  type AuthPrincipal,
  CurrentUser,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import type { CustomPrompt } from '@openthrottle/nestjs-repositories-server';
import {
  CustomPromptsRepository,
  RolesRepository,
} from '@openthrottle/nestjs-repositories-server';

import {
  CreateCustomPromptInput,
  ListCustomPromptsInput,
  UpdateCustomPromptInput,
} from './custom-prompt.input.ts';
import { CustomPromptObject } from './custom-prompt.object.ts';
import { resolveCustomPromptWritePath } from './prompts.utils.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
// for the queries and DB-only mutations; any filesystem write additionally
// requires SETTINGS_WRITE, checked in-body because only the opt-in write branch
// is privileged.
@Resolver(() => CustomPromptObject)
export class CustomPromptsResolver {
  constructor(
    private readonly configService: ConfigService,
    private readonly customPromptsRepository: CustomPromptsRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  @Query(() => CustomPromptObject, {
    description: 'Get a custom prompt by ID',
    nullable: true,
  })
  async customPrompt(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CustomPrompt | null> {
    return this.customPromptsRepository.findOne({ where: { id } });
  }

  @Query(() => [CustomPromptObject], {
    description: 'List custom prompts with optional filters',
  })
  async customPrompts(
    @Args('input', { nullable: true, type: () => ListCustomPromptsInput })
    input?: ListCustomPromptsInput,
  ): Promise<CustomPrompt[]> {
    return this.customPromptsRepository.listFiltered({
      includeDeleted: input?.includeDeleted ?? false,
      labels: input?.labels ?? null,
      projectId: input?.projectId || null,
      promptType: input?.promptType || null,
      search: input?.search || null,
      userId: input?.userId || null,
    });
  }

  @Mutation(() => CustomPromptObject, {
    description: 'Create a new custom prompt',
  })
  async createCustomPrompt(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => CreateCustomPromptInput })
    input: CreateCustomPromptInput,
  ): Promise<CustomPrompt> {
    // Gate BEFORE the save so a refused write never persists a row.
    let writeTarget: string | null = null;
    if (input.writeToFileSystem && input.filePath) {
      writeTarget = await this.resolveWriteTarget(principal, input.filePath);
    }

    const saved = await this.customPromptsRepository.create({
      content: input.content,
      description: input.description ?? null,
      filePath: input.filePath ?? null,
      labels: input.labels ?? [],
      projectId: input.projectId ?? null,
      promptType: input.promptType,
      title: input.title,
      userId: input.userId ?? null,
    });

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
    const entity = await this.customPromptsRepository.findOne({
      where: { id: input.id },
    });

    if (!entity) return null;

    // Gate BEFORE the save so a refused write never persists the edit.
    const filePathToWrite = input.filePath ?? entity.filePath;
    let writeTarget: string | null = null;
    if (input.writeToFileSystem && filePathToWrite) {
      writeTarget = await this.resolveWriteTarget(principal, filePathToWrite);
    }

    const saved = await this.customPromptsRepository.update(entity.id, {
      ...(input.title != null && { title: input.title }),
      ...(input.content != null && { content: input.content }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.promptType != null && { promptType: input.promptType }),
      ...(input.labels != null && { labels: input.labels }),
      ...(input.filePath !== undefined && { filePath: input.filePath }),
      ...(input.userId !== undefined && { userId: input.userId }),
      ...(input.projectId !== undefined && { projectId: input.projectId }),
    });

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
    return this.customPromptsRepository.softDeleteById(id);
  }

  @Mutation(() => Boolean, {
    description: 'Permanently delete a custom prompt by ID',
  })
  async hardDeleteCustomPrompt(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.customPromptsRepository.hardDeleteById(id);
  }

  @Mutation(() => CustomPromptObject, {
    description: 'Restore a soft-deleted custom prompt',
    nullable: true,
  })
  async restoreCustomPrompt(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CustomPrompt | null> {
    return this.customPromptsRepository.restoreById(id);
  }

  @Mutation(() => Boolean, {
    description: `Write a custom prompt to the file system at its configured filePath`,
  })
  async writeCustomPromptToFileSystem(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const entity = await this.customPromptsRepository.findOne({
      where: { id },
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

    let permissions: string[];
    if (principal.kind === AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT) {
      permissions = await this.rolesRepository.getPermissionsForServiceAccount(
        principal.sub,
      );
    } else {
      permissions = await this.rolesRepository.getPermissionsForUser(
        principal.sub,
      );
    }

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
