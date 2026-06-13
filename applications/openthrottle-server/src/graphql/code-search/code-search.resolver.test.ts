/**
 * @description Tests for CodeSearchResolver: repository resolution + provider gating for
 * codeSemanticSearch, status derivation for codeIndexStatus, and enqueue/dedup for
 * indexCodeRepository. Services + the BullMQ queue are mocked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { WorkspaceLocalRepositoriesService } from '@openthrottle/nestjs-repositories';
import type { WorkspaceLocalRepository } from '@openthrottle/nestjs-repositories';
import { CodeSearchService } from '@openthrottle/nestjs-vector-search';
import type { Queue } from 'bullmq';
import { CodeSearchResolver } from './code-search.resolver';

const USER_ID = 'user-1';
const REPO_ID = 'repo-1';
const PATH = '/Users/dev/repo';

function repoStub(): WorkspaceLocalRepository {
  return createMock<WorkspaceLocalRepository>({ filesystemPath: PATH });
}

describe('CodeSearchResolver', () => {
  let codeSearch: CodeSearchService;
  let repositories: WorkspaceLocalRepositoriesService;
  let queue: Queue;
  let resolver: CodeSearchResolver;

  beforeEach(() => {
    codeSearch = createMock<CodeSearchService>();
    repositories = createMock<WorkspaceLocalRepositoriesService>();
    queue = createMock<Queue>();
    vi.mocked(codeSearch.isProviderConfigured).mockReturnValue(true);
    vi.mocked(repositories.findByIdForUser).mockResolvedValue(repoStub());
    resolver = new CodeSearchResolver(codeSearch, repositories, queue);
  });

  describe('codeSemanticSearch', () => {
    const input = { limit: null, query: 'find user', repositoryId: REPO_ID };

    it('throws when repositoryId is blank', async () => {
      await expect(
        resolver.codeSemanticSearch(USER_ID, { ...input, repositoryId: '  ' }),
      ).rejects.toThrow('repositoryId is required');
    });

    it('throws when the repository is unknown for the user', async () => {
      vi.mocked(repositories.findByIdForUser).mockResolvedValue(null);
      await expect(resolver.codeSemanticSearch(USER_ID, input)).rejects.toThrow(
        'No registered repository repo-1',
      );
    });

    it('returns available=false (no search) when no provider is configured', async () => {
      vi.mocked(codeSearch.isProviderConfigured).mockReturnValue(false);
      const result = await resolver.codeSemanticSearch(USER_ID, input);
      expect(result).toEqual({ available: false, matches: [] });
      expect(codeSearch.codeSemanticSearch).not.toHaveBeenCalled();
    });

    it('resolves the path and returns matches with available=true', async () => {
      const matches = [
        { content: 'x', endLine: 2, path: 'a.ts', score: 0.9, startLine: 1 },
      ];
      vi.mocked(codeSearch.codeSemanticSearch).mockResolvedValue(matches);

      const result = await resolver.codeSemanticSearch(USER_ID, input);

      expect(repositories.findByIdForUser).toHaveBeenCalledWith(
        REPO_ID,
        USER_ID,
      );
      expect(codeSearch.codeSemanticSearch).toHaveBeenCalledWith(
        PATH,
        'find user',
        10,
      );
      expect(result).toEqual({ available: true, matches });
    });

    it('clamps limit to the max of 50', async () => {
      vi.mocked(codeSearch.codeSemanticSearch).mockResolvedValue([]);
      await resolver.codeSemanticSearch(USER_ID, { ...input, limit: 999 });
      expect(codeSearch.codeSemanticSearch).toHaveBeenCalledWith(
        PATH,
        'find user',
        50,
      );
    });
  });

  describe('codeIndexStatus', () => {
    it('is unavailable when no provider is configured', async () => {
      vi.mocked(codeSearch.isProviderConfigured).mockReturnValue(false);
      const result = await resolver.codeIndexStatus(USER_ID, REPO_ID);
      expect(result.status).toBe('unavailable');
    });

    it('is indexing when a job is pending', async () => {
      vi.mocked(codeSearch.indexedChunkCount).mockResolvedValue(0);
      vi.mocked(queue.getJob).mockResolvedValue(
        createMock<Awaited<ReturnType<Queue['getJob']>>>({
          getState: vi.fn().mockResolvedValue('active'),
        }),
      );
      const result = await resolver.codeIndexStatus(USER_ID, REPO_ID);
      expect(result.status).toBe('indexing');
    });

    it('is ready when chunks exist and no job is pending', async () => {
      vi.mocked(codeSearch.indexedChunkCount).mockResolvedValue(42);
      vi.mocked(queue.getJob).mockResolvedValue(undefined);
      const result = await resolver.codeIndexStatus(USER_ID, REPO_ID);
      expect(result).toEqual({
        indexedChunks: 42,
        repositoryId: REPO_ID,
        status: 'ready',
      });
    });

    it('is notIndexed when nothing is indexed and no job is pending', async () => {
      vi.mocked(codeSearch.indexedChunkCount).mockResolvedValue(0);
      vi.mocked(queue.getJob).mockResolvedValue(undefined);
      const result = await resolver.codeIndexStatus(USER_ID, REPO_ID);
      expect(result.status).toBe('notIndexed');
    });
  });

  describe('indexCodeRepository', () => {
    it('returns unavailable without enqueuing when no provider is configured', async () => {
      vi.mocked(codeSearch.isProviderConfigured).mockReturnValue(false);
      const result = await resolver.indexCodeRepository(USER_ID, REPO_ID);
      expect(result.status).toBe('unavailable');
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('enqueues with jobId=repositoryId and returns indexing', async () => {
      const result = await resolver.indexCodeRepository(USER_ID, REPO_ID);

      expect(queue.add).toHaveBeenCalledWith(
        'index-code-repository',
        { repositoryId: REPO_ID, userId: USER_ID },
        { jobId: REPO_ID, removeOnComplete: true, removeOnFail: true },
      );
      expect(result).toEqual({ repositoryId: REPO_ID, status: 'indexing' });
    });
  });
});
