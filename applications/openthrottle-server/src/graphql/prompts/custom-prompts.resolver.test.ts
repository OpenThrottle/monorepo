import type { CustomPrompt } from '@openthrottle/nestjs-repositories';
import { CustomPromptsService } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { CustomPromptTypeEnum } from './custom-prompt.object';
import { CustomPromptsResolver } from './custom-prompts.resolver';

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
  get: vi.fn().mockReturnValue('/tmp/test-workspace'),
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

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        CustomPromptsResolver,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomPromptsService, useValue: mockCustomPromptsService },
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

      const result = await resolver.createCustomPrompt({
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

      const result = await resolver.updateCustomPrompt({
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

      const result = await resolver.updateCustomPrompt({
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
});
