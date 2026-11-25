/**
 * @description Tests for CodeSearchResolver: repository resolution + provider gating for
 * codeSemanticSearch, status derivation for codeIndexStatus, and enqueue/dedup for
 * indexCodeRepository. Services + the BullMQ queue are mocked.
 */

import { createMock } from '@golevelup/ts-vitest';
import type {
  RepositoryCheckout,
  RepositoryCheckoutsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type { CodeSearchService } from '@openthrottle/nestjs-vector-search';
import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CheckoutPathResolutionService } from '../../services/checkout-path-resolution/checkout-path-resolution.service.ts';
import type { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import type { WorkspaceLocalRepositoriesService } from '../../services/workspace-local-repositories/workspace-local-repositories.service.ts';
import type { WorkspaceLocalRepository } from '../../services/workspace-local-repositories/workspace-local-repositories.types.ts';
import { CodeSearchResolver } from './code-search.resolver.ts';

const USER_ID = 'user-1';
const REPO_ID = 'repo-1';
const PATH = '/Users/dev/repo';
const REFUSAL = 'Code indexing is off under EMBEDDING_PROVIDER=openai.';

function repoStub(): WorkspaceLocalRepository {
  return createMock<WorkspaceLocalRepository>({ filesystemPath: PATH });
}

describe('CodeSearchResolver', () => {
  let codeSearch: CodeSearchService;
  let repositories: WorkspaceLocalRepositoriesService;
  let checkoutPathResolution: CheckoutPathResolutionService;
  let checkouts: RepositoryCheckoutsRepository;
  let effectiveUserResolution: EffectiveUserResolutionService;
  let queue: Queue;
  let resolver: CodeSearchResolver;

  beforeEach(() => {
    codeSearch = createMock<CodeSearchService>();
    repositories = createMock<WorkspaceLocalRepositoriesService>();
    queue = createMock<Queue>();
    checkoutPathResolution = createMock<CheckoutPathResolutionService>();
    checkouts = createMock<RepositoryCheckoutsRepository>();
    vi.mocked(checkouts.findByRepositoryIdForUser).mockResolvedValue([]);
    effectiveUserResolution = createMock<EffectiveUserResolutionService>();
    vi.mocked(effectiveUserResolution.resolveEffectiveUserId).mockResolvedValue(
      USER_ID,
    );
    vi.mocked(checkoutPathResolution.resolveCheckoutForPath).mockResolvedValue(
      null,
    );
    vi.mocked(codeSearch.isProviderConfigured).mockReturnValue(true);
    vi.mocked(codeSearch.codeIndexingRefusal).mockReturnValue(null);
    vi.mocked(repositories.findByIdForUser).mockResolvedValue(repoStub());
    resolver = new CodeSearchResolver(
      codeSearch,
      repositories,
      checkoutPathResolution,
      checkouts,
      effectiveUserResolution,
      queue,
    );
  });

  describe('codeSemanticSearch', () => {
    const input = {
      limit: null,
      query: 'find user',
      repositoryId: REPO_ID,
      workspacePath: null,
    };

    it('throws when neither repositoryId nor workspacePath is given', async () => {
      await expect(
        resolver.codeSemanticSearch(USER_ID, { ...input, repositoryId: '  ' }),
      ).rejects.toThrow('A repositoryId or a workspacePath is required');
    });

    describe('when the caller is a service account', () => {
      it('scopes the repository lookup to the user it acts for', async () => {
        vi.mocked(
          effectiveUserResolution.resolveEffectiveUserId,
        ).mockResolvedValue('human-1');
        vi.mocked(codeSearch.codeSemanticSearch).mockResolvedValue([]);

        await resolver.codeSemanticSearch('service-account-1', input);

        expect(repositories.findByIdForUser).toHaveBeenCalledWith(
          REPO_ID,
          'human-1',
        );
      });
    });

    describe('when only a workspacePath is given', () => {
      const byPath = {
        ...input,
        repositoryId: null,
        workspacePath: '/Users/dev/repo-worktree',
      };

      it('searches the registered checkout containing it', async () => {
        vi.mocked(
          checkoutPathResolution.resolveCheckoutForPath,
        ).mockResolvedValue({
          checkoutId: REPO_ID,
          repositoryId: 'repository-row-1',
        });
        vi.mocked(codeSearch.codeSemanticSearch).mockResolvedValue([]);

        await resolver.codeSemanticSearch(USER_ID, byPath);

        expect(
          checkoutPathResolution.resolveCheckoutForPath,
        ).toHaveBeenCalledWith({
          path: '/Users/dev/repo-worktree',
          userId: USER_ID,
        });
        expect(repositories.findByIdForUser).toHaveBeenCalledWith(
          REPO_ID,
          USER_ID,
        );
        expect(codeSearch.codeSemanticSearch).toHaveBeenCalledWith(
          PATH,
          'find user',
          10,
        );
      });

      describe('when that checkout has no index', () => {
        const PRIMARY = '/Users/dev/primary';
        const checkoutAt = (
          filesystemPath: string,
          kind: RepositoryCheckout['kind'],
        ): RepositoryCheckout => {
          return createMock<RepositoryCheckout>({ filesystemPath, kind });
        };

        beforeEach(() => {
          vi.mocked(
            checkoutPathResolution.resolveCheckoutForPath,
          ).mockResolvedValue({
            checkoutId: REPO_ID,
            repositoryId: 'repository-row-1',
          });
          vi.mocked(codeSearch.codeSemanticSearch).mockResolvedValue([]);
          vi.mocked(codeSearch.indexedChunkCount).mockImplementation(
            async (path: string) => {
              return path === PRIMARY ? 960 : 0;
            },
          );
        });

        it('searches the indexed primary checkout of the same repository', async () => {
          vi.mocked(checkouts.findByRepositoryIdForUser).mockResolvedValue([
            checkoutAt('/Users/dev/other-worktree', 'worktree'),
            checkoutAt(PRIMARY, 'primary'),
          ]);

          await resolver.codeSemanticSearch(USER_ID, byPath);

          expect(checkouts.findByRepositoryIdForUser).toHaveBeenCalledWith(
            'repository-row-1',
            USER_ID,
          );
          expect(codeSearch.codeSemanticSearch).toHaveBeenCalledWith(
            PRIMARY,
            'find user',
            10,
          );
        });

        it('keeps the resolved checkout when no sibling is indexed', async () => {
          await resolver.codeSemanticSearch(USER_ID, byPath);

          expect(codeSearch.codeSemanticSearch).toHaveBeenCalledWith(
            PATH,
            'find user',
            10,
          );
        });
      });

      it('throws when no registered checkout contains it', async () => {
        await expect(
          resolver.codeSemanticSearch(USER_ID, byPath),
        ).rejects.toThrow('No registered checkout contains');
      });
    });

    it('returns matches sorted by score, highest first', async () => {
      vi.mocked(codeSearch.codeSemanticSearch).mockResolvedValue([
        { content: 'a', endLine: 1, path: 'a.ts', score: 0.4, startLine: 1 },
        { content: 'b', endLine: 1, path: 'b.ts', score: 0.9, startLine: 1 },
      ]);

      const result = await resolver.codeSemanticSearch(USER_ID, input);

      expect(result.matches.map((match) => match.path)).toEqual([
        'b.ts',
        'a.ts',
      ]);
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

    it('returns available=false (no search) when a hosted provider is not opted in', async () => {
      vi.mocked(codeSearch.codeIndexingRefusal).mockReturnValue(REFUSAL);
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

    it('is hostedOptInRequired when a hosted provider is not opted in', async () => {
      vi.mocked(codeSearch.codeIndexingRefusal).mockReturnValue(REFUSAL);
      const result = await resolver.codeIndexStatus(USER_ID, REPO_ID);
      expect(result).toEqual({
        failedReason: null,
        indexedChunks: 0,
        repositoryId: REPO_ID,
        status: 'hostedOptInRequired',
      });
      expect(codeSearch.indexedChunkCount).not.toHaveBeenCalled();
    });

    it('is indexing when a job is pending', async () => {
      vi.mocked(codeSearch.indexedChunkCount).mockResolvedValue(0);
      vi.mocked(queue.getJob).mockResolvedValue(
        createMock<NonNullable<Awaited<ReturnType<Queue['getJob']>>>>({
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
        failedReason: null,
        indexedChunks: 42,
        repositoryId: REPO_ID,
        status: 'ready',
      });
    });

    it('is failed, with the reason, when the last job failed over a partial index', async () => {
      vi.mocked(codeSearch.indexedChunkCount).mockResolvedValue(2432);
      vi.mocked(queue.getJob).mockResolvedValue(
        createMock<NonNullable<Awaited<ReturnType<Queue['getJob']>>>>({
          failedReason: 'invalid byte sequence for encoding "UTF8": 0x00',
          getState: vi.fn().mockResolvedValue('failed'),
        }),
      );
      const result = await resolver.codeIndexStatus(USER_ID, REPO_ID);
      expect(result).toEqual({
        failedReason: 'invalid byte sequence for encoding "UTF8": 0x00',
        indexedChunks: 2432,
        repositoryId: REPO_ID,
        status: 'failed',
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

    it('returns hostedOptInRequired without enqueuing when a hosted provider is not opted in', async () => {
      vi.mocked(codeSearch.codeIndexingRefusal).mockReturnValue(REFUSAL);
      const result = await resolver.indexCodeRepository(USER_ID, REPO_ID);
      expect(result).toEqual({
        repositoryId: REPO_ID,
        status: 'hostedOptInRequired',
      });
      expect(queue.add).not.toHaveBeenCalled();
    });

    it('enqueues with jobId=repositoryId and returns indexing', async () => {
      const result = await resolver.indexCodeRepository(USER_ID, REPO_ID);

      expect(queue.add).toHaveBeenCalledWith(
        'index-code-repository',
        { repositoryId: REPO_ID, userId: USER_ID },
        { jobId: REPO_ID, removeOnComplete: true, removeOnFail: false },
      );
      expect(result).toEqual({ repositoryId: REPO_ID, status: 'indexing' });
    });

    it('removes a kept failed job first, so the re-index is not ignored', async () => {
      const remove = vi.fn().mockResolvedValue(undefined);
      vi.mocked(queue.getJob).mockResolvedValue(
        createMock<NonNullable<Awaited<ReturnType<Queue['getJob']>>>>({
          getState: vi.fn().mockResolvedValue('failed'),
          remove,
        }),
      );

      await resolver.indexCodeRepository(USER_ID, REPO_ID);

      expect(remove).toHaveBeenCalledOnce();
      expect(queue.add).toHaveBeenCalledOnce();
    });
  });
});
