import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type ServiceAccountAuthPrincipal,
  type UserAuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import type { CustomPrompt } from '@openthrottle/nestjs-repositories-server';
import {
  CustomPromptsRepository,
  RolesRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createCustomPromptsRepositoryMock,
  createRolesRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { CustomPromptTypeEnum } from './custom-prompt.object.ts';
import {
  CUSTOM_PROMPT_ACCESS_REFUSAL,
  CUSTOM_PROMPT_WRITE_REFUSAL,
} from './prompts.constants.ts';
import { CustomPromptsResolver } from './prompts.resolver.ts';

const workspaceRoot = mkdtempSync(join(tmpdir(), 'custom-prompts-resolver-'));

const USER_A = 'b0d2f1e6-6c3f-4a1e-9c94-8b0f2d0f5a11';
const USER_B = 'c1e3a2f7-7d4a-4b2f-8da5-9c1a3e1a6b22';

const principal: UserAuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: USER_A,
};

const linkedServiceAccount: ServiceAccountAuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: 'sa-linked',
};

const unlinkedServiceAccount: ServiceAccountAuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: 'sa-unlinked',
};

const resolveEffectiveUserId = vi.fn(
  async (sub: string | null | undefined): Promise<string | null> => {
    if (sub === 'sa-linked') return USER_A;
    if (sub === 'sa-unlinked' || sub == null) return null;
    return sub;
  },
);

const customPromptsRepository = createCustomPromptsRepositoryMock();

const mockConfigService = createMock<ConfigService>({
  get: vi.fn().mockReturnValue(workspaceRoot),
});

const mockRolesRepository = createRolesRepositoryMock();
mockRolesRepository.getPermissionsForServiceAccount.mockResolvedValue([]);
mockRolesRepository.getPermissionsForUser.mockResolvedValue([
  PERMISSIONS.SETTINGS_WRITE,
]);

describe('CustomPromptsResolver', () => {
  let resolver: CustomPromptsResolver;

  const mockCustomPrompt = {
    content: '# Agent Instructions\n\nBe helpful.',
    createdAt: new Date('2026-02-22T10:00:00.000Z'),
    deletedAt: null,
    description: 'Instructions for AI agents',
    filePath: '.agents/prompts/agents.md',
    id: 'f8739915-f5b5-42eb-b49a-424ec69e81d0',
    labels: ['ai', 'cursor'],
    projectId: null,
    promptType: 'agents',
    title: 'Agent Instructions',
    updatedAt: new Date('2026-02-22T10:05:00.000Z'),
    userId: USER_A,
  } satisfies CustomPrompt;

  const systemPrompt: CustomPrompt = {
    ...mockCustomPrompt,
    id: '0a1b2c3d-0000-4000-8000-000000000001',
    userId: null,
  };

  const otherUserPrompt: CustomPrompt = {
    ...mockCustomPrompt,
    id: '0a1b2c3d-0000-4000-8000-000000000002',
    userId: USER_B,
  };

  const emptyUpdate = {
    content: null,
    description: null,
    filePath: null,
    id: mockCustomPrompt.id,
    labels: null,
    projectId: null,
    promptType: null,
    title: 'Updated Title',
    userId: null,
    writeToFileSystem: false,
  };

  beforeEach(() => {
    mockRolesRepository.getPermissionsForUser.mockResolvedValue([
      PERMISSIONS.SETTINGS_WRITE,
    ]);
    customPromptsRepository.create.mockReset();
    customPromptsRepository.findIncludingDeleted.mockReset();
    customPromptsRepository.findVisibleById.mockReset();
    customPromptsRepository.hardDeleteById.mockReset();
    customPromptsRepository.listFiltered.mockReset();
    customPromptsRepository.restoreById.mockReset();
    customPromptsRepository.softDeleteById.mockReset();
    customPromptsRepository.update.mockReset();
    customPromptsRepository.findIncludingDeleted.mockResolvedValue(
      mockCustomPrompt,
    );
    customPromptsRepository.findVisibleById.mockResolvedValue(mockCustomPrompt);
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        CustomPromptsResolver,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomPromptsRepository, useValue: customPromptsRepository },
        {
          provide: EffectiveUserResolutionService,
          useValue: { resolveEffectiveUserId },
        },
        { provide: RolesRepository, useValue: mockRolesRepository },
      ],
    }).compile();

    resolver = app.get<CustomPromptsResolver>(CustomPromptsResolver);
  });

  describe('customPrompt', () => {
    test('returns the prompt scoped to the caller', async () => {
      const result = await resolver.customPrompt(
        principal,
        mockCustomPrompt.id,
      );

      expect(result?.id).toBe(mockCustomPrompt.id);
      expect(customPromptsRepository.findVisibleById).toHaveBeenCalledWith(
        mockCustomPrompt.id,
        USER_A,
      );
    });

    test('returns null when the prompt is missing or belongs to another user', async () => {
      customPromptsRepository.findVisibleById.mockResolvedValue(null);

      await expect(
        resolver.customPrompt(principal, otherUserPrompt.id),
      ).resolves.toBeNull();
      expect(customPromptsRepository.findVisibleById).toHaveBeenCalledWith(
        otherUserPrompt.id,
        USER_A,
      );
    });

    test('returns a system prompt to any user', async () => {
      customPromptsRepository.findVisibleById.mockResolvedValue(systemPrompt);

      const asUserB = await resolver.customPrompt(
        { kind: AUTH_PRINCIPAL_KIND_USER, sub: USER_B },
        systemPrompt.id,
      );

      expect(asUserB?.id).toBe(systemPrompt.id);
      expect(customPromptsRepository.findVisibleById).toHaveBeenCalledWith(
        systemPrompt.id,
        USER_B,
      );
    });

    test('scopes a linked service account to its acting user', async () => {
      await resolver.customPrompt(linkedServiceAccount, mockCustomPrompt.id);

      expect(customPromptsRepository.findVisibleById).toHaveBeenCalledWith(
        mockCustomPrompt.id,
        USER_A,
      );
    });

    test('scopes an unlinked service account to system prompts only', async () => {
      await resolver.customPrompt(unlinkedServiceAccount, systemPrompt.id);

      expect(customPromptsRepository.findVisibleById).toHaveBeenCalledWith(
        systemPrompt.id,
        null,
      );
    });
  });

  describe('customPrompts', () => {
    const noFilters = {
      includeDeleted: false,
      labels: null,
      projectId: null,
      promptType: null,
      search: null,
      userId: null,
    };

    test('returns the visible prompts', async () => {
      customPromptsRepository.listFiltered.mockResolvedValue([
        mockCustomPrompt,
        systemPrompt,
      ]);

      const result = await resolver.customPrompts(principal);

      expect(result.map((prompt) => prompt.id)).toEqual([
        mockCustomPrompt.id,
        systemPrompt.id,
      ]);
    });

    test('scopes the list to the caller when no input is passed', async () => {
      await resolver.customPrompts(principal);

      expect(customPromptsRepository.listFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null, viewerUserId: USER_A }),
      );
    });

    test('scopes each caller to their own user id', async () => {
      await resolver.customPrompts({
        kind: AUTH_PRINCIPAL_KIND_USER,
        sub: USER_B,
      });

      expect(customPromptsRepository.listFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ viewerUserId: USER_B }),
      );
    });

    test('a client userId only narrows and never widens the scope', async () => {
      await resolver.customPrompts(principal, {
        ...noFilters,
        userId: USER_B,
      });

      expect(customPromptsRepository.listFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_B, viewerUserId: USER_A }),
      );
    });

    test('scopes a linked service account to its acting user', async () => {
      await resolver.customPrompts(linkedServiceAccount);

      expect(customPromptsRepository.listFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ viewerUserId: USER_A }),
      );
    });

    test('lists system prompts only for an unlinked service account', async () => {
      await resolver.customPrompts(unlinkedServiceAccount);

      expect(customPromptsRepository.listFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ viewerUserId: null }),
      );
    });

    test('filters by promptType when provided', async () => {
      await resolver.customPrompts(principal, {
        ...noFilters,
        promptType: CustomPromptTypeEnum.AGENTS,
      });

      expect(customPromptsRepository.listFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ promptType: CustomPromptTypeEnum.AGENTS }),
      );
    });

    test('filters by search when provided', async () => {
      await resolver.customPrompts(principal, {
        ...noFilters,
        search: 'agent',
      });

      expect(customPromptsRepository.listFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'agent' }),
      );
    });
  });

  describe('createCustomPrompt', () => {
    const createInput = {
      content: mockCustomPrompt.content,
      description: mockCustomPrompt.description,
      filePath: mockCustomPrompt.filePath,
      labels: mockCustomPrompt.labels,
      projectId: null,
      promptType: CustomPromptTypeEnum.AGENTS,
      title: mockCustomPrompt.title,
      userId: null,
      writeToFileSystem: false,
    };

    test('creates the prompt owned by the caller', async () => {
      customPromptsRepository.create.mockResolvedValue(mockCustomPrompt);

      const result = await resolver.createCustomPrompt(principal, createInput);

      expect(result.id).toBe(mockCustomPrompt.id);
      expect(customPromptsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_A }),
      );
    });

    test('ignores a client-supplied userId', async () => {
      customPromptsRepository.create.mockResolvedValue(mockCustomPrompt);

      await resolver.createCustomPrompt(principal, {
        ...createInput,
        userId: USER_B,
      });
      await resolver.createCustomPrompt(principal, {
        ...createInput,
        userId: null,
      });

      expect(customPromptsRepository.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ userId: USER_A }),
      );
      expect(customPromptsRepository.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ userId: USER_A }),
      );
    });

    test('stamps a linked service account with its acting user', async () => {
      customPromptsRepository.create.mockResolvedValue(mockCustomPrompt);

      await resolver.createCustomPrompt(linkedServiceAccount, createInput);

      expect(customPromptsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_A }),
      );
    });

    test('refuses an unlinked service account instead of creating a system row', async () => {
      await expect(
        resolver.createCustomPrompt(unlinkedServiceAccount, createInput),
      ).rejects.toThrow(CUSTOM_PROMPT_ACCESS_REFUSAL.userRequired);

      expect(customPromptsRepository.create).not.toHaveBeenCalled();
    });

    test('refuses an unauthenticated caller', async () => {
      await expect(
        resolver.createCustomPrompt(undefined, createInput),
      ).rejects.toThrow(ForbiddenException);

      expect(customPromptsRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCustomPrompt', () => {
    test('updates and returns the prompt the caller owns', async () => {
      customPromptsRepository.update.mockResolvedValue({
        ...mockCustomPrompt,
        title: 'Updated Title',
      });

      const result = await resolver.updateCustomPrompt(principal, emptyUpdate);

      expect(result?.title).toBe('Updated Title');
      expect(customPromptsRepository.update).toHaveBeenCalledWith(
        mockCustomPrompt.id,
        expect.objectContaining({ title: 'Updated Title' }),
      );
    });

    test('returns null when the prompt does not exist', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(null);

      await expect(
        resolver.updateCustomPrompt(principal, emptyUpdate),
      ).resolves.toBeNull();
      expect(customPromptsRepository.update).not.toHaveBeenCalled();
    });

    test('returns null for a soft-deleted prompt', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue({
        ...mockCustomPrompt,
        deletedAt: new Date('2026-03-01T00:00:00.000Z'),
      });

      await expect(
        resolver.updateCustomPrompt(principal, emptyUpdate),
      ).resolves.toBeNull();
    });

    test("cannot update another user's prompt", async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(
        otherUserPrompt,
      );

      await expect(
        resolver.updateCustomPrompt(principal, {
          ...emptyUpdate,
          id: otherUserPrompt.id,
        }),
      ).resolves.toBeNull();
      expect(customPromptsRepository.update).not.toHaveBeenCalled();
    });

    test('refuses to edit a system prompt', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(
        systemPrompt,
      );

      await expect(
        resolver.updateCustomPrompt(principal, {
          ...emptyUpdate,
          id: systemPrompt.id,
        }),
      ).rejects.toThrow(CUSTOM_PROMPT_ACCESS_REFUSAL.systemPromptReadOnly);
      expect(customPromptsRepository.update).not.toHaveBeenCalled();
    });

    test('never reassigns the owner from a client userId', async () => {
      customPromptsRepository.update.mockResolvedValue(mockCustomPrompt);

      await resolver.updateCustomPrompt(principal, {
        ...emptyUpdate,
        userId: USER_B,
      });

      expect(customPromptsRepository.update).toHaveBeenCalledWith(
        mockCustomPrompt.id,
        expect.not.objectContaining({ userId: expect.anything() }),
      );
    });

    test('refuses an unlinked service account', async () => {
      await expect(
        resolver.updateCustomPrompt(unlinkedServiceAccount, emptyUpdate),
      ).rejects.toThrow(CUSTOM_PROMPT_ACCESS_REFUSAL.userRequired);
    });
  });

  describe('deleteCustomPrompt', () => {
    test('soft deletes a prompt the caller owns', async () => {
      customPromptsRepository.softDeleteById.mockResolvedValue(true);

      const result = await resolver.deleteCustomPrompt(
        principal,
        mockCustomPrompt.id,
      );

      expect(result).toBe(true);
      expect(customPromptsRepository.softDeleteById).toHaveBeenCalledWith(
        mockCustomPrompt.id,
      );
    });

    test('returns false when the prompt does not exist', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(null);

      await expect(
        resolver.deleteCustomPrompt(principal, 'non-existent-id'),
      ).resolves.toBe(false);
      expect(customPromptsRepository.softDeleteById).not.toHaveBeenCalled();
    });

    test("cannot delete another user's prompt", async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(
        otherUserPrompt,
      );

      await expect(
        resolver.deleteCustomPrompt(principal, otherUserPrompt.id),
      ).resolves.toBe(false);
      expect(customPromptsRepository.softDeleteById).not.toHaveBeenCalled();
    });

    test('refuses to delete a system prompt', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(
        systemPrompt,
      );

      await expect(
        resolver.deleteCustomPrompt(principal, systemPrompt.id),
      ).rejects.toThrow(CUSTOM_PROMPT_ACCESS_REFUSAL.systemPromptReadOnly);
      expect(customPromptsRepository.softDeleteById).not.toHaveBeenCalled();
    });

    test('refuses an unlinked service account', async () => {
      await expect(
        resolver.deleteCustomPrompt(
          unlinkedServiceAccount,
          mockCustomPrompt.id,
        ),
      ).rejects.toThrow(CUSTOM_PROMPT_ACCESS_REFUSAL.userRequired);
    });
  });

  describe('hardDeleteCustomPrompt', () => {
    test('permanently deletes a prompt the caller owns, soft deleted or not', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue({
        ...mockCustomPrompt,
        deletedAt: new Date('2026-03-01T00:00:00.000Z'),
      });
      customPromptsRepository.hardDeleteById.mockResolvedValue(true);

      await expect(
        resolver.hardDeleteCustomPrompt(principal, mockCustomPrompt.id),
      ).resolves.toBe(true);
      expect(customPromptsRepository.hardDeleteById).toHaveBeenCalledWith(
        mockCustomPrompt.id,
      );
    });

    test('returns false when the prompt does not exist', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(null);

      await expect(
        resolver.hardDeleteCustomPrompt(principal, 'non-existent-id'),
      ).resolves.toBe(false);
    });

    test("cannot permanently delete another user's prompt", async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(
        otherUserPrompt,
      );

      await expect(
        resolver.hardDeleteCustomPrompt(principal, otherUserPrompt.id),
      ).resolves.toBe(false);
      expect(customPromptsRepository.hardDeleteById).not.toHaveBeenCalled();
    });

    test('refuses to permanently delete a system prompt', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(
        systemPrompt,
      );

      await expect(
        resolver.hardDeleteCustomPrompt(principal, systemPrompt.id),
      ).rejects.toThrow(CUSTOM_PROMPT_ACCESS_REFUSAL.systemPromptReadOnly);
      expect(customPromptsRepository.hardDeleteById).not.toHaveBeenCalled();
    });
  });

  describe('restoreCustomPrompt', () => {
    test('restores a soft-deleted prompt the caller owns', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue({
        ...mockCustomPrompt,
        deletedAt: new Date('2026-03-01T00:00:00.000Z'),
      });
      customPromptsRepository.restoreById.mockResolvedValue(mockCustomPrompt);

      const result = await resolver.restoreCustomPrompt(
        principal,
        mockCustomPrompt.id,
      );

      expect(result?.id).toBe(mockCustomPrompt.id);
    });

    test('returns null when the prompt does not exist', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(null);

      await expect(
        resolver.restoreCustomPrompt(principal, 'non-existent-id'),
      ).resolves.toBeNull();
    });

    test("cannot restore another user's prompt", async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(
        otherUserPrompt,
      );

      await expect(
        resolver.restoreCustomPrompt(principal, otherUserPrompt.id),
      ).resolves.toBeNull();
      expect(customPromptsRepository.restoreById).not.toHaveBeenCalled();
    });

    test('refuses to restore a system prompt', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(
        systemPrompt,
      );

      await expect(
        resolver.restoreCustomPrompt(principal, systemPrompt.id),
      ).rejects.toThrow(CUSTOM_PROMPT_ACCESS_REFUSAL.systemPromptReadOnly);
    });
  });

  describe('filesystem write gate', () => {
    const writeInput = (filePath: string) => {
      return {
        content: '# Written\n',
        description: null,
        filePath,
        id: mockCustomPrompt.id,
        labels: null,
        projectId: null,
        promptType: null,
        title: null,
        userId: null,
        writeToFileSystem: true,
      };
    };

    test('writes an ordinary workspace-relative path', async () => {
      customPromptsRepository.update.mockResolvedValue(mockCustomPrompt);

      await resolver.updateCustomPrompt(
        principal,
        writeInput('prompts/written.md'),
      );

      expect(
        readFileSync(join(workspaceRoot, 'prompts/written.md'), 'utf8'),
      ).toBe('# Written\n');
    });

    test('refuses a traversal escape without saving the row', async () => {
      customPromptsRepository.update.mockClear();
      customPromptsRepository.create.mockClear();

      await expect(
        resolver.updateCustomPrompt(
          principal,
          writeInput('../escaped-prompt.md'),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(customPromptsRepository.update).not.toHaveBeenCalled();
      expect(customPromptsRepository.create).not.toHaveBeenCalled();
    });

    test('refuses a SKILL.md target, leaving the file untouched', async () => {
      const skillPath = join(workspaceRoot, 'SKILL.md');
      writeFileSync(skillPath, 'upstream\n');

      await expect(
        resolver.updateCustomPrompt(principal, writeInput('SKILL.md')),
      ).rejects.toThrow(CUSTOM_PROMPT_WRITE_REFUSAL.skillContent);

      expect(readFileSync(skillPath, 'utf8')).toBe('upstream\n');
    });

    test('refuses the write without the settings:write permission', async () => {
      mockRolesRepository.getPermissionsForUser.mockResolvedValue([]);

      await expect(
        resolver.updateCustomPrompt(
          principal,
          writeInput('prompts/unauthorized.md'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    test('refuses the write for an unauthenticated principal', async () => {
      await expect(
        resolver.updateCustomPrompt(
          undefined,
          writeInput('prompts/anonymous.md'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    test('createCustomPrompt refuses before persisting the row', async () => {
      customPromptsRepository.update.mockClear();
      customPromptsRepository.create.mockClear();

      await expect(
        resolver.createCustomPrompt(principal, {
          content: '# Escape\n',
          description: null,
          filePath: '../escaped-create.md',
          labels: [],
          projectId: null,
          promptType: CustomPromptTypeEnum.AGENTS,
          title: 'Escape',
          userId: null,
          writeToFileSystem: true,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(customPromptsRepository.update).not.toHaveBeenCalled();
      expect(customPromptsRepository.create).not.toHaveBeenCalled();
    });

    test('writeCustomPromptToFileSystem honours the path policy', async () => {
      customPromptsRepository.findVisibleById.mockResolvedValue({
        ...mockCustomPrompt,
        filePath: '../escaped-stored.md',
      });

      await expect(
        resolver.writeCustomPromptToFileSystem(principal, mockCustomPrompt.id),
      ).rejects.toThrow(BadRequestException);
    });

    test('refuses an absolute path, leaving the target untouched', async () => {
      const outside = mkdtempSync(join(tmpdir(), 'custom-prompts-outside-'));
      const target = join(outside, 'absolute.md');

      await expect(
        resolver.updateCustomPrompt(principal, writeInput(target)),
      ).rejects.toThrow(CUSTOM_PROMPT_WRITE_REFUSAL.absolutePath);

      expect(existsSync(target)).toBe(false);
      expect(customPromptsRepository.update).not.toHaveBeenCalled();
    });

    test('refuses a ".." segment buried inside the path', async () => {
      await expect(
        resolver.updateCustomPrompt(
          principal,
          writeInput('prompts/../../buried-escape.md'),
        ),
      ).rejects.toThrow(CUSTOM_PROMPT_WRITE_REFUSAL.parentSegment);

      expect(existsSync(join(workspaceRoot, '../buried-escape.md'))).toBe(
        false,
      );
    });

    test('createCustomPrompt refuses an absolute path before persisting', async () => {
      await expect(
        resolver.createCustomPrompt(principal, {
          content: '# Escape\n',
          description: null,
          filePath: '/tmp/escaped-absolute-create.md',
          labels: [],
          projectId: null,
          promptType: CustomPromptTypeEnum.AGENTS,
          title: 'Escape',
          userId: null,
          writeToFileSystem: true,
        }),
      ).rejects.toThrow(CUSTOM_PROMPT_WRITE_REFUSAL.absolutePath);

      expect(customPromptsRepository.create).not.toHaveBeenCalled();
    });

    test("cannot write another user's prompt to disk", async () => {
      customPromptsRepository.findVisibleById.mockResolvedValue(null);

      await expect(
        resolver.writeCustomPromptToFileSystem(principal, otherUserPrompt.id),
      ).resolves.toBe(false);
    });

    test('cannot overwrite another user prompt through update', async () => {
      customPromptsRepository.findIncludingDeleted.mockResolvedValue(
        otherUserPrompt,
      );

      await expect(
        resolver.updateCustomPrompt(principal, {
          ...writeInput('prompts/stolen.md'),
          id: otherUserPrompt.id,
        }),
      ).resolves.toBeNull();

      expect(existsSync(join(workspaceRoot, 'prompts/stolen.md'))).toBe(false);
    });
  });
});
