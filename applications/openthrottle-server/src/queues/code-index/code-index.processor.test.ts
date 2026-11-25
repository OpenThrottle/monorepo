/**
 * @description Tests for CodeIndexProcessor: payload validation, provider gate, repository
 * resolution, and the happy-path delegation to CodeSearchService.indexCodeWorkspace.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { CodeSearchService } from '@openthrottle/nestjs-vector-search';
import {
  CONTAINER_WORKSPACES_DIR_ENV,
  HOST_WORKSPACES_DIR_ENV,
} from '@openthrottle/openthrottle-agentic-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceLocalRepositoriesService } from '../../services/workspace-local-repositories/workspace-local-repositories.service.ts';
import { CodeIndexProcessor } from './code-index.processor.ts';
import type { CodeIndexJob } from './code-index.types.ts';

type Repository = NonNullable<
  Awaited<ReturnType<WorkspaceLocalRepositoriesService['findByIdForUser']>>
>;

function buildJob(data: Partial<CodeIndexJob['data']> = {}): CodeIndexJob {
  return createMock<CodeIndexJob>({
    data: { repositoryId: 'repo-1', userId: 'user-1', ...data },
    id: 'job-1',
  });
}

describe('CodeIndexProcessor', () => {
  let processor: CodeIndexProcessor;
  let codeSearch: CodeSearchService;
  let repositories: WorkspaceLocalRepositoriesService;
  let logger: LoggerService;

  beforeEach(async () => {
    codeSearch = createMock<CodeSearchService>();
    logger = createMock<LoggerService>();
    repositories = createMock<WorkspaceLocalRepositoriesService>();
    vi.mocked(codeSearch.isProviderConfigured).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodeIndexProcessor,
        { provide: LoggerService, useValue: logger },
        { provide: CodeSearchService, useValue: codeSearch },
        {
          provide: WorkspaceLocalRepositoriesService,
          useValue: repositories,
        },
      ],
    }).compile();

    processor = module.get(CodeIndexProcessor);
  });

  it('throws when the payload is missing repositoryId or userId', async () => {
    await expect(
      processor.process(buildJob({ repositoryId: '' })),
    ).rejects.toThrow('requires both repositoryId and userId');
  });

  it('throws when the embedder is unavailable', async () => {
    vi.mocked(codeSearch.isProviderConfigured).mockReturnValue(false);
    await expect(processor.process(buildJob())).rejects.toThrow(
      'The embedder is unavailable',
    );
  });

  it('throws when the repository is not found for the user', async () => {
    vi.mocked(repositories.findByIdForUser).mockResolvedValue(null);
    await expect(processor.process(buildJob())).rejects.toThrow(
      'No registered repository repo-1',
    );
  });

  it('resolves the path and indexes it, echoing repositoryId', async () => {
    vi.mocked(repositories.findByIdForUser).mockResolvedValue(
      createMock<Repository>({ filesystemPath: '/Users/dev/repo' }),
    );
    vi.mocked(codeSearch.indexCodeWorkspace).mockResolvedValue({
      deletedPaths: 3,
      embedded: 42,
      skipped: [],
    });

    const result = await processor.process(buildJob());

    expect(repositories.findByIdForUser).toHaveBeenCalledWith(
      'repo-1',
      'user-1',
    );
    expect(codeSearch.indexCodeWorkspace).toHaveBeenCalledWith(
      '/Users/dev/repo',
    );
    expect(result).toEqual({
      deletedPaths: 3,
      embedded: 42,
      repositoryId: 'repo-1',
      skipped: 0,
    });
  });

  describe('when chunks were skipped', () => {
    it('counts them in the result and warns with their locations', async () => {
      vi.mocked(repositories.findByIdForUser).mockResolvedValue(
        createMock<Repository>({ filesystemPath: '/Users/dev/repo' }),
      );
      vi.mocked(codeSearch.indexCodeWorkspace).mockResolvedValue({
        deletedPaths: 0,
        embedded: 5,
        skipped: [
          {
            endLine: 260,
            path: 'scripts/audit.ts',
            reason: 'invalid byte sequence',
            startLine: 239,
          },
        ],
      });

      const result = await processor.process(buildJob());

      expect(result.skipped).toBe(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('scripts/audit.ts:239-260'),
        expect.any(String),
      );
    });
  });

  describe('when a job fails', () => {
    it('logs it as an error', () => {
      processor.onJobFailed(buildJob(), new Error('provider down'));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('provider down'),
        expect.anything(),
        expect.stringContaining('job-1'),
      );
    });
  });

  describe('when the Docker workspace bridge is active', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('indexes the container view of the path, the key search reads', async () => {
      vi.stubEnv(HOST_WORKSPACES_DIR_ENV, '/Users/dev');
      vi.stubEnv(CONTAINER_WORKSPACES_DIR_ENV, '/workspaces');
      vi.mocked(repositories.findByIdForUser).mockResolvedValue(
        createMock<Repository>({ filesystemPath: '/Users/dev/repo' }),
      );
      vi.mocked(codeSearch.indexCodeWorkspace).mockResolvedValue({
        deletedPaths: 0,
        embedded: 1,
        skipped: [],
      });

      await processor.process(buildJob());

      expect(codeSearch.indexCodeWorkspace).toHaveBeenCalledWith(
        '/workspaces/repo',
      );
    });
  });
});
