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
 * DB-only create/update (the default, `writeToFileSystem: false`) stays
 * authenticated-only.
 *
 * Ownership: every read is scoped to the caller's prompts plus system prompts
 * (`user_id IS NULL`); every write is scoped to the caller's own prompts. The
 * caller is the human user the principal acts as (a service account resolves to
 * its acting user, and to no one when unlinked). A client-supplied `userId` is
 * never trusted: create stamps the resolved user, update cannot reassign it, and
 * the list filter only narrows within what the caller may already see. System
 * rows belong to the agent-asset ingest and are read-only through this API.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  CurrentUser,
} from '@openthrottle/nestjs-auth';
import { isUniqueViolation } from '@openthrottle/nestjs-postgres';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import type { CustomPrompt } from '@openthrottle/nestjs-repositories-server';
import {
  CustomPromptsRepository,
  RolesRepository,
} from '@openthrottle/nestjs-repositories-server';

import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import {
  CreateCustomPromptInput,
  ListCustomPromptsInput,
  UpdateCustomPromptInput,
} from './custom-prompt.input.ts';
import { CustomPromptObject } from './custom-prompt.object.ts';
import { CUSTOM_PROMPT_ACCESS_REFUSAL } from './prompts.constants.ts';
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
    private readonly effectiveUserResolutionService: EffectiveUserResolutionService,
    private readonly rolesRepository: RolesRepository,
  ) {}

  @Query(() => CustomPromptObject, {
    description: `Get a custom prompt by ID. Null when it does not exist or belongs to another user; system prompts are visible to everyone.`,
    nullable: true,
  })
  async customPrompt(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CustomPrompt | null> {
    const viewerUserId = await this.resolveViewerUserId(principal);
    return this.customPromptsRepository.findVisibleById(id, viewerUserId);
  }

  @Query(() => [CustomPromptObject], {
    description: `List the caller's custom prompts plus system prompts, with optional filters.`,
  })
  async customPrompts(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { nullable: true, type: () => ListCustomPromptsInput })
    input?: ListCustomPromptsInput,
  ): Promise<CustomPrompt[]> {
    const viewerUserId = await this.resolveViewerUserId(principal);
    return this.customPromptsRepository.listFiltered({
      includeDeleted: input?.includeDeleted ?? false,
      labels: input?.labels ?? null,
      projectId: input?.projectId || null,
      promptType: input?.promptType || null,
      search: input?.search || null,
      // Narrows within the visible set only; it can never widen it.
      userId: input?.userId || null,
      viewerUserId,
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
    const ownerUserId = await this.requireOwnerUserId(principal);

    // Gate BEFORE the save so a refused write never persists a row.
    let writeTarget: string | null = null;
    if (input.writeToFileSystem && input.filePath) {
      writeTarget = await this.resolveWriteTarget(principal, input.filePath);
    }

    const saved = await this.rethrowDuplicatePath(
      this.customPromptsRepository.create({
        content: input.content,
        description: input.description ?? null,
        filePath: input.filePath ?? null,
        labels: input.labels ?? [],
        projectId: input.projectId ?? null,
        promptType: input.promptType,
        title: input.title,
        userId: ownerUserId,
      }),
    );

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
    const ownerUserId = await this.requireOwnerUserId(principal);
    const entity = await this.findOwnedPrompt(input.id, ownerUserId, false);

    if (!entity) return null;

    // Gate BEFORE the save so a refused write never persists the edit.
    const filePathToWrite = input.filePath ?? entity.filePath;
    let writeTarget: string | null = null;
    if (input.writeToFileSystem && filePathToWrite) {
      writeTarget = await this.resolveWriteTarget(principal, filePathToWrite);
    }

    const saved = await this.rethrowDuplicatePath(
      this.customPromptsRepository.update(entity.id, {
        ...(input.title != null && { title: input.title }),
        ...(input.content != null && { content: input.content }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.promptType != null && { promptType: input.promptType }),
        ...(input.labels != null && { labels: input.labels }),
        ...(input.filePath !== undefined && { filePath: input.filePath }),
        ...(input.projectId !== undefined && { projectId: input.projectId }),
      }),
    );

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
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const ownerUserId = await this.requireOwnerUserId(principal);
    const entity = await this.findOwnedPrompt(id, ownerUserId, false);

    if (!entity) return false;

    return this.customPromptsRepository.softDeleteById(entity.id);
  }

  @Mutation(() => Boolean, {
    description: 'Permanently delete a custom prompt by ID',
  })
  async hardDeleteCustomPrompt(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const ownerUserId = await this.requireOwnerUserId(principal);
    const entity = await this.findOwnedPrompt(id, ownerUserId, true);

    if (!entity) return false;

    return this.customPromptsRepository.hardDeleteById(entity.id);
  }

  @Mutation(() => CustomPromptObject, {
    description: 'Restore a soft-deleted custom prompt',
    nullable: true,
  })
  async restoreCustomPrompt(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<CustomPrompt | null> {
    const ownerUserId = await this.requireOwnerUserId(principal);
    const entity = await this.findOwnedPrompt(id, ownerUserId, true);

    if (!entity) return null;

    return this.customPromptsRepository.restoreById(entity.id);
  }

  @Mutation(() => Boolean, {
    description: `Write a custom prompt to the file system at its configured filePath`,
  })
  async writeCustomPromptToFileSystem(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    // Writing a prompt to disk leaves the row untouched, so a system prompt the
    // caller can see may be written too; the SETTINGS_WRITE gate still applies.
    const viewerUserId = await this.resolveViewerUserId(principal);
    const entity = await this.customPromptsRepository.findVisibleById(
      id,
      viewerUserId,
    );

    if (!entity || !entity.filePath) return false;

    const writeTarget = await this.resolveWriteTarget(
      principal,
      entity.filePath,
    );
    await this.writeToFileSystem(writeTarget, entity.content);

    return true;
  }

  /**
   * @description The human user the principal acts as, or null for no principal
   * or a service account that is unlinked or disabled (system rows only).
   */
  private async resolveViewerUserId(
    principal: AuthPrincipal | undefined,
  ): Promise<string | null> {
    return this.effectiveUserResolutionService.resolveEffectiveUserId(
      principal?.sub,
    );
  }

  /**
   * @description The user a write is made on behalf of. Throws
   * `ForbiddenException` when the principal resolves to no user, so a write
   * can never create or touch a system (`user_id IS NULL`) row.
   */
  private async requireOwnerUserId(
    principal: AuthPrincipal | undefined,
  ): Promise<string> {
    const userId = await this.resolveViewerUserId(principal);
    if (userId == null) {
      throw new ForbiddenException(CUSTOM_PROMPT_ACCESS_REFUSAL.userRequired);
    }
    return userId;
  }

  /**
   * @description The prompt `ownerUserId` owns, or null when it is missing, owned
   * by someone else (indistinguishable to the caller) or, without
   * `includeDeleted`, soft deleted. A system row is refused with
   * `ForbiddenException`: it is read-only through the API.
   */
  private async findOwnedPrompt(
    id: string,
    ownerUserId: string,
    includeDeleted: boolean,
  ): Promise<CustomPrompt | null> {
    const prompt = await this.customPromptsRepository.findIncludingDeleted(id);
    if (prompt == null) {
      return null;
    }
    if (prompt.userId == null) {
      throw new ForbiddenException(
        CUSTOM_PROMPT_ACCESS_REFUSAL.systemPromptReadOnly,
      );
    }
    if (prompt.userId !== ownerUserId) {
      return null;
    }
    if (!includeDeleted && prompt.deletedAt != null) {
      return null;
    }
    return prompt;
  }

  /**
   * @description Awaits a prompt write, turning the per-owner `(file_path, prompt_type)` unique
   * violation into a Conflict the caller can act on. Since migration 190 that index is scoped
   * per owner, so it fires only when the caller already owns a prompt at the path — a system
   * prompt at the same path no longer collides, it is overridden.
   */
  private async rethrowDuplicatePath<TResult>(
    write: Promise<TResult>,
  ): Promise<TResult> {
    try {
      return await write;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(CUSTOM_PROMPT_ACCESS_REFUSAL.duplicatePath);
      }
      throw error;
    }
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
