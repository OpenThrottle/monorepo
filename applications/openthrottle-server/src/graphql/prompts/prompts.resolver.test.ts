import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  AUTH_PRINCIPAL_KIND_USER,
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

import { CustomPromptTypeEnum } from './custom-prompt.object.ts';
import { CUSTOM_PROMPT_WRITE_REFUSAL } from './prompts.constants.ts';
import { CustomPromptsResolver } from './prompts.resolver.ts';

const workspaceRoot = mkdtempSync(join(tmpdir(), 'custom-prompts-resolver-'));

const principal: UserAuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: 'b0d2f1e6-6c3f-4a1e-9c94-8b0f2d0f5a11',
};

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
    userId: null,
  } satisfies CustomPrompt;

  beforeEach(() => {
    mockRolesRepository.getPermissionsForUser.mockResolvedValue([
      PERMISSIONS.SETTINGS_WRITE,
    ]);
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        CustomPromptsResolver,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomPromptsRepository, useValue: customPromptsRepository },
        { provide: RolesRepository, useValue: mockRolesRepository },
      ],
    }).compile();

    resolver = app.get<CustomPromptsResolver>(CustomPromptsResolver);
  });

  describe('customPrompt', () => {
    test('returns CustomPromptObject when prompt exists', async () => {
      customPromptsRepository.findOne.mockResolvedValue(mockCustomPrompt);

      const result = await resolver.customPrompt(mockCustomPrompt.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockCustomPrompt.id);
      expect(result?.title).toBe(mockCustomPrompt.title);
      expect(result?.promptType).toBe(mockCustomPrompt.promptType);
    });

    test('returns null when prompt does not exist', async () => {
      customPromptsRepository.findOne.mockResolvedValue(null);

      const result = await resolver.customPrompt('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('customPrompts', () => {
    test('returns array of CustomPromptObjects', async () => {
      customPromptsRepository.listFiltered.mockResolvedValue([
        mockCustomPrompt,
      ]);

      const result = await resolver.customPrompts();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockCustomPrompt.id);
    });

    test('filters by promptType when provided', async () => {
      await resolver.customPrompts({
        includeDeleted: false,
        labels: null,
        projectId: null,
        promptType: CustomPromptTypeEnum.AGENTS,
        search: null,
        userId: null,
      });

      expect(customPromptsRepository.listFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ promptType: CustomPromptTypeEnum.AGENTS }),
      );
    });

    test('filters by search when provided', async () => {
      await resolver.customPrompts({
        includeDeleted: false,
        labels: null,
        projectId: null,
        promptType: null,
        search: 'agent',
        userId: null,
      });

      expect(customPromptsRepository.listFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'agent' }),
      );
    });
  });

  describe('createCustomPrompt', () => {
    test('creates and returns new CustomPromptObject', async () => {
      customPromptsRepository.create.mockResolvedValue(mockCustomPrompt);

      const result = await resolver.createCustomPrompt(principal, {
        content: mockCustomPrompt.content,
        description: mockCustomPrompt.description,
        filePath: mockCustomPrompt.filePath,
        labels: mockCustomPrompt.labels,
        projectId: null,
        promptType: CustomPromptTypeEnum.AGENTS,
        title: mockCustomPrompt.title,
        userId: null,
        writeToFileSystem: false,
      });

      expect(result.id).toBe(mockCustomPrompt.id);
      expect(result.title).toBe(mockCustomPrompt.title);
    });
  });

  describe('updateCustomPrompt', () => {
    test('updates and returns CustomPromptObject when found', async () => {
      const updatedPrompt = { ...mockCustomPrompt, title: 'Updated Title' };
      customPromptsRepository.findOne.mockResolvedValue(mockCustomPrompt);
      customPromptsRepository.update.mockResolvedValue(updatedPrompt);

      const result = await resolver.updateCustomPrompt(principal, {
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
      });

      expect(result?.title).toBe('Updated Title');
    });

    test('returns null when prompt not found', async () => {
      customPromptsRepository.findOne.mockResolvedValue(null);

      const result = await resolver.updateCustomPrompt(principal, {
        content: null,
        description: null,
        filePath: null,
        id: 'non-existent-id',
        labels: null,
        projectId: null,
        promptType: null,
        title: 'Updated Title',
        userId: null,
        writeToFileSystem: false,
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteCustomPrompt', () => {
    test('soft deletes and returns true when prompt found', async () => {
      customPromptsRepository.softDeleteById.mockResolvedValue(true);

      const result = await resolver.deleteCustomPrompt(mockCustomPrompt.id);

      expect(result).toBe(true);
      expect(customPromptsRepository.softDeleteById).toHaveBeenCalledWith(
        mockCustomPrompt.id,
      );
    });

    test('returns false when prompt not found', async () => {
      customPromptsRepository.softDeleteById.mockResolvedValue(false);

      const result = await resolver.deleteCustomPrompt('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('hardDeleteCustomPrompt', () => {
    test('permanently deletes and returns true when affected > 0', async () => {
      customPromptsRepository.hardDeleteById.mockResolvedValue(true);

      const result = await resolver.hardDeleteCustomPrompt(mockCustomPrompt.id);

      expect(result).toBe(true);
    });

    test('returns false when no rows affected', async () => {
      customPromptsRepository.hardDeleteById.mockResolvedValue(false);

      const result = await resolver.hardDeleteCustomPrompt('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('restoreCustomPrompt', () => {
    test('returns the restored prompt', async () => {
      customPromptsRepository.restoreById.mockResolvedValue(mockCustomPrompt);

      const result = await resolver.restoreCustomPrompt(mockCustomPrompt.id);

      expect(result?.id).toBe(mockCustomPrompt.id);
    });

    test('returns null when the prompt is absent or not deleted', async () => {
      customPromptsRepository.restoreById.mockResolvedValue(null);

      await expect(
        resolver.restoreCustomPrompt('non-existent-id'),
      ).resolves.toBeNull();
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
      customPromptsRepository.findOne.mockResolvedValue(mockCustomPrompt);
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
      customPromptsRepository.findOne.mockResolvedValue(mockCustomPrompt);
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

      customPromptsRepository.findOne.mockResolvedValue(mockCustomPrompt);

      await expect(
        resolver.updateCustomPrompt(principal, writeInput('SKILL.md')),
      ).rejects.toThrow(CUSTOM_PROMPT_WRITE_REFUSAL.skillContent);

      expect(readFileSync(skillPath, 'utf8')).toBe('upstream\n');
    });

    test('refuses the write without the settings:write permission', async () => {
      mockRolesRepository.getPermissionsForUser.mockResolvedValue([]);

      customPromptsRepository.findOne.mockResolvedValue(mockCustomPrompt);

      await expect(
        resolver.updateCustomPrompt(
          principal,
          writeInput('prompts/unauthorized.md'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    test('refuses the write for an unauthenticated principal', async () => {
      customPromptsRepository.findOne.mockResolvedValue(mockCustomPrompt);

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
      customPromptsRepository.findOne.mockResolvedValue({
        ...mockCustomPrompt,
        filePath: '../escaped-stored.md',
      });

      await expect(
        resolver.writeCustomPromptToFileSystem(principal, mockCustomPrompt.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
