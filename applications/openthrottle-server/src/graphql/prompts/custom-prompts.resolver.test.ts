import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CustomPrompt } from '@openthrottle/nestjs-repositories';
import {
  CustomPromptsService,
  RolesService,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type UserAuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS } from '@openthrottle/nestjs-rbac';
import { Test } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { CUSTOM_PROMPT_WRITE_REFUSAL } from './custom-prompt-write-path';
import { CustomPromptTypeEnum } from './custom-prompt.object';
import { CustomPromptsResolver } from './custom-prompts.resolver';

const workspaceRoot = mkdtempSync(join(tmpdir(), 'custom-prompts-resolver-'));

const principal: UserAuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: 'b0d2f1e6-6c3f-4a1e-9c94-8b0f2d0f5a11',
};

const mockQueryBuilder = {
  andWhere: vi.fn().mockReturnThis(),
  getMany: vi.fn(),
  orderBy: vi.fn().mockReturnThis(),
};

const customPromptsRepo = {
  create: vi.fn(),
  createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
  delete: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
};

const mockCustomPromptsService = createMock<CustomPromptsService>({
  getRepository: vi.fn().mockReturnValue(customPromptsRepo),
});

const mockConfigService = createMock<ConfigService>({
  get: vi.fn().mockReturnValue(workspaceRoot),
});

const mockRolesService = createMock<RolesService>({
  getPermissionsForServiceAccount: vi.fn().mockResolvedValue([]),
  getPermissionsForUser: vi
    .fn()
    .mockResolvedValue([PERMISSIONS.SETTINGS_WRITE]),
});

describe('CustomPromptsResolver', () => {
  let resolver: CustomPromptsResolver;
  let customPromptsService: CustomPromptsService;

  const mockCustomPrompt = {
    content: '# Agent Instructions\n\nBe helpful.',
    createdAt: new Date('2026-02-22T10:00:00.000Z'),
    deletedAt: null,
    description: 'Instructions for AI agents',
    filePath: '.cursor/rules/agents.mdc',
    id: 'f8739915-f5b5-42eb-b49a-424ec69e81d0',
    labels: ['ai', 'cursor'],
    projectId: null,
    promptType: 'agents',
    title: 'Agent Instructions',
    updatedAt: new Date('2026-02-22T10:05:00.000Z'),
    userId: null,
  } satisfies CustomPrompt;

  beforeEach(() => {
    vi.mocked(mockRolesService.getPermissionsForUser).mockResolvedValue([
      PERMISSIONS.SETTINGS_WRITE,
    ]);
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        CustomPromptsResolver,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomPromptsService, useValue: mockCustomPromptsService },
        { provide: RolesService, useValue: mockRolesService },
      ],
    }).compile();

    resolver = app.get<CustomPromptsResolver>(CustomPromptsResolver);
    customPromptsService = app.get<CustomPromptsService>(CustomPromptsService);
  });

  describe('customPrompt', () => {
    test('returns CustomPromptObject when prompt exists', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockCustomPrompt);

      const result = await resolver.customPrompt(mockCustomPrompt.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockCustomPrompt.id);
      expect(result?.title).toBe(mockCustomPrompt.title);
      expect(result?.promptType).toBe(mockCustomPrompt.promptType);
    });

    test('returns null when prompt does not exist', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      const result = await resolver.customPrompt('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('customPrompts', () => {
    test('returns array of CustomPromptObjects', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockCustomPrompt]);

      const result = await resolver.customPrompts();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockCustomPrompt.id);
    });

    test('filters by promptType when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockCustomPrompt]);

      await resolver.customPrompts({
        includeDeleted: false,
        labels: null,
        projectId: null,
        promptType: CustomPromptTypeEnum.AGENTS,
        search: null,
        userId: null,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'cp.prompt_type = :promptType',
        { promptType: CustomPromptTypeEnum.AGENTS },
      );
    });

    test('filters by search when provided', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await resolver.customPrompts({
        includeDeleted: false,
        labels: null,
        projectId: null,
        promptType: null,
        search: 'agent',
        userId: null,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'cp.title ILIKE :search',
        { search: '%agent%' },
      );
    });
  });

  describe('createCustomPrompt', () => {
    test('creates and returns new CustomPromptObject', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.create).mockReturnValue(mockCustomPrompt);
      vi.mocked(repo.save).mockResolvedValue(mockCustomPrompt);

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
      const repo = customPromptsService.getRepository();
      const updatedPrompt = { ...mockCustomPrompt, title: 'Updated Title' };
      vi.mocked(repo.findOne).mockResolvedValue(mockCustomPrompt);
      vi.mocked(repo.save).mockResolvedValue(updatedPrompt);

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
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

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
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockCustomPrompt);
      vi.mocked(repo.save).mockResolvedValue({
        ...mockCustomPrompt,
        deletedAt: new Date(),
      });

      const result = await resolver.deleteCustomPrompt(mockCustomPrompt.id);

      expect(result).toBe(true);
    });

    test('returns false when prompt not found', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(null);

      const result = await resolver.deleteCustomPrompt('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('hardDeleteCustomPrompt', () => {
    test('permanently deletes and returns true when affected > 0', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.delete).mockResolvedValue({ affected: 1, raw: [] });

      const result = await resolver.hardDeleteCustomPrompt(mockCustomPrompt.id);

      expect(result).toBe(true);
    });

    test('returns false when no rows affected', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.delete).mockResolvedValue({ affected: 0, raw: [] });

      const result = await resolver.hardDeleteCustomPrompt('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('filesystem write gate', () => {
    const writeInput = (filePath: string) => ({
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
    });

    test('writes an ordinary workspace-relative path', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockCustomPrompt);
      vi.mocked(repo.save).mockResolvedValue(mockCustomPrompt);

      await resolver.updateCustomPrompt(
        principal,
        writeInput('prompts/written.md'),
      );

      expect(
        readFileSync(join(workspaceRoot, 'prompts/written.md'), 'utf8'),
      ).toBe('# Written\n');
    });

    test('refuses a traversal escape without saving the row', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockCustomPrompt);
      vi.mocked(repo.save).mockClear();

      await expect(
        resolver.updateCustomPrompt(
          principal,
          writeInput('../escaped-prompt.md'),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    test('refuses a SKILL.md target, leaving the file untouched', async () => {
      const skillPath = join(workspaceRoot, 'SKILL.md');
      writeFileSync(skillPath, 'upstream\n');

      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockCustomPrompt);

      await expect(
        resolver.updateCustomPrompt(principal, writeInput('SKILL.md')),
      ).rejects.toThrow(CUSTOM_PROMPT_WRITE_REFUSAL.skillContent);

      expect(readFileSync(skillPath, 'utf8')).toBe('upstream\n');
    });

    test('refuses the write without the settings:write permission', async () => {
      vi.mocked(mockRolesService.getPermissionsForUser).mockResolvedValue([]);

      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockCustomPrompt);

      await expect(
        resolver.updateCustomPrompt(
          principal,
          writeInput('prompts/unauthorized.md'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    test('refuses the write for an unauthenticated principal', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue(mockCustomPrompt);

      await expect(
        resolver.updateCustomPrompt(
          undefined,
          writeInput('prompts/anonymous.md'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    test('createCustomPrompt refuses before persisting the row', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.save).mockClear();

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

      expect(repo.save).not.toHaveBeenCalled();
    });

    test('writeCustomPromptToFileSystem honours the path policy', async () => {
      const repo = customPromptsService.getRepository();
      vi.mocked(repo.findOne).mockResolvedValue({
        ...mockCustomPrompt,
        filePath: '../escaped-stored.md',
      });

      await expect(
        resolver.writeCustomPromptToFileSystem(principal, mockCustomPrompt.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
