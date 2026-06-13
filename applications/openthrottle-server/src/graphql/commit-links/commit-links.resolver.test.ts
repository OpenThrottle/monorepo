import type { CommitLink } from '@openthrottle/nestjs-repositories';
import { CommitLinksService } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, beforeEach, test, vi } from 'vitest';
import { CommitLinksLoaders } from './commit-links-loaders';
import { CommitLinksResolver } from './commit-links.resolver';

describe('CommitLinksResolver', () => {
  let resolver: CommitLinksResolver;

  const mockCommitLink: CommitLink = {
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    message: 'feat(openthrottle): add GraphQL for tasks',
    // FIXME: Swap out eventually
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plan: null as unknown as any,
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    repo: 'owner/repo',
    sha: 'abc123def456',
    task: null,
    taskId: 'b366d480-6a4f-498b-8755-23ade25d2b24',
  };

  const createdEntity = {
    ...mockCommitLink,
    message: 'feat: add linkCommit',
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    repo: 'owner/repo',
    sha: 'abc123def456',
    taskId: null,
  };

  const commitLinksRepo = {
    create: vi.fn().mockReturnValue(createdEntity),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn().mockResolvedValue(createdEntity),
  };

  const mockCommitLinksService = createMock<CommitLinksService>({
    getRepository: vi.fn().mockReturnValue(commitLinksRepo),
  });

  const mockPlanLoad = vi.fn().mockResolvedValue(null);
  const mockTaskLoad = vi.fn().mockResolvedValue(null);
  const mockLoaders: CommitLinksLoaders = {
    planLoader: { load: mockPlanLoad },
    taskLoader: { load: mockTaskLoad },
  } as unknown as CommitLinksLoaders;

  beforeEach(() => {
    mockPlanLoad.mockReset().mockResolvedValue(null);
    mockTaskLoad.mockReset().mockResolvedValue(null);
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        CommitLinksResolver,
        { provide: CommitLinksService, useValue: mockCommitLinksService },
        { provide: CommitLinksLoaders, useValue: mockLoaders },
      ],
    }).compile();

    resolver = app.get<CommitLinksResolver>(CommitLinksResolver);
  });

  describe('commitLink', () => {
    test('returns CommitLinkObject when commit link exists', async () => {
      vi.mocked(commitLinksRepo.findOne).mockResolvedValue(mockCommitLink);

      const result = await resolver.commitLink({ id: mockCommitLink.id });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockCommitLink.id);
      expect(result?.planId).toBe(mockCommitLink.planId);
      expect(result?.taskId).toBe(mockCommitLink.taskId);
      expect(result?.repo).toBe(mockCommitLink.repo);
      expect(result?.sha).toBe(mockCommitLink.sha);
      expect(result?.message).toBe(mockCommitLink.message);
      expect(result?.createdAt).toEqual(mockCommitLink.createdAt);
    });

    test('returns null when commit link does not exist', async () => {
      vi.mocked(commitLinksRepo.findOne).mockResolvedValue(null);

      const result = await resolver.commitLink({ id: 'non-existent-id' });

      expect(result).toBeNull();
    });
  });

  describe('commitLinks', () => {
    test('returns array of CommitLinkObjects', async () => {
      vi.mocked(commitLinksRepo.find).mockResolvedValue([mockCommitLink]);

      const result = await resolver.commitLinks();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockCommitLink.id);
      expect(result[0]?.sha).toBe(mockCommitLink.sha);
    });

    test('returns empty array when no commit links', async () => {
      vi.mocked(commitLinksRepo.find).mockResolvedValue([]);

      const result = await resolver.commitLinks();

      expect(result).toEqual([]);
    });

    test('applies a default take cap and honors an explicit clamped limit', async () => {
      vi.mocked(commitLinksRepo.find).mockResolvedValue([]);

      await resolver.commitLinks();
      expect(commitLinksRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );

      await resolver.commitLinks(10000);
      expect(commitLinksRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 500 }),
      );
    });
  });

  describe('commitLinksByPlanId', () => {
    test('returns array of CommitLinkObjects for plan', async () => {
      vi.mocked(commitLinksRepo.find).mockResolvedValue([mockCommitLink]);

      const result = await resolver.commitLinksByPlanId({
        planId: mockCommitLink.planId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.planId).toBe(mockCommitLink.planId);
    });
  });

  describe('commitLinksByTaskId', () => {
    test('returns array of CommitLinkObjects for task', async () => {
      vi.mocked(commitLinksRepo.find).mockResolvedValue([mockCommitLink]);

      const result = await resolver.commitLinksByTaskId({
        taskId: mockCommitLink.taskId ?? '',
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.taskId).toBe(mockCommitLink.taskId);
    });
  });

  describe('linkCommit', () => {
    test('creates and returns CommitLinkObject', async () => {
      const input = {
        message: 'feat: add linkCommit',
        planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
        repo: 'owner/repo',
        sha: 'abc123def456',
        taskId: null,
      };

      const result = await resolver.linkCommit(input);

      expect(commitLinksRepo.create).toHaveBeenCalledWith({
        message: input.message,
        planId: input.planId,
        repo: input.repo,
        sha: input.sha,
        taskId: input.taskId,
      });
      expect(commitLinksRepo.save).toHaveBeenCalledWith(createdEntity);
      expect(result).not.toBeNull();
      expect(result.planId).toBe(input.planId);
      expect(result.repo).toBe(input.repo);
      expect(result.sha).toBe(input.sha);
    });
  });

  describe('plan (ResolveField)', () => {
    test('returns null without hitting the loader when parent has no planId', async () => {
      const parent = new (
        await import('./commit-link.object')
      ).CommitLinkObject();
      parent.planId = '';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
      expect(mockPlanLoad).not.toHaveBeenCalled();
    });

    test('resolves the plan through planLoader when planId is set', async () => {
      const { CommitLinkObject } = await import('./commit-link.object');
      const mockPlan = { id: mockCommitLink.planId, title: 'Test plan' };
      mockPlanLoad.mockResolvedValueOnce(mockPlan);

      const parent = new CommitLinkObject();
      parent.planId = mockCommitLink.planId;

      const result = await resolver.plan(parent);

      expect(mockPlanLoad).toHaveBeenCalledWith(mockCommitLink.planId);
      expect(result).toBe(mockPlan);
    });

    test('returns null when planLoader resolves null', async () => {
      const { CommitLinkObject } = await import('./commit-link.object');
      mockPlanLoad.mockResolvedValueOnce(null);

      const parent = new CommitLinkObject();
      parent.planId = 'missing-plan-id';

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });
  });

  describe('task (ResolveField)', () => {
    test('returns null without hitting the loader when parent has no taskId', async () => {
      const parent = new (
        await import('./commit-link.object')
      ).CommitLinkObject();
      parent.taskId = null;

      const result = await resolver.task(parent);

      expect(result).toBeNull();
      expect(mockTaskLoad).not.toHaveBeenCalled();
    });

    test('resolves the task through taskLoader when taskId is set', async () => {
      const { CommitLinkObject } = await import('./commit-link.object');
      const mockTask = { id: mockCommitLink.taskId, title: 'Test task' };
      mockTaskLoad.mockResolvedValueOnce(mockTask);

      const parent = new CommitLinkObject();
      parent.taskId = mockCommitLink.taskId;

      const result = await resolver.task(parent);

      expect(mockTaskLoad).toHaveBeenCalledWith(mockCommitLink.taskId);
      expect(result).toBe(mockTask);
    });

    test('returns null when taskLoader resolves null', async () => {
      const { CommitLinkObject } = await import('./commit-link.object');
      mockTaskLoad.mockResolvedValueOnce(null);

      const parent = new CommitLinkObject();
      parent.taskId = 'missing-task-id';

      const result = await resolver.task(parent);

      expect(result).toBeNull();
    });
  });
});
