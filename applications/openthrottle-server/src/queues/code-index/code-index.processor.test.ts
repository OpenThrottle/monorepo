/**
 * @description Tests for CodeIndexProcessor: payload validation, provider gate, repository
 * resolution, and the happy-path delegation to CodeSearchService.indexCodeWorkspace.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { WorkspaceLocalRepositoriesService } from '@openthrottle/nestjs-repositories';
import { CodeSearchService } from '@openthrottle/nestjs-vector-search';
import { createMock } from '@golevelup/ts-vitest';
import { CodeIndexProcessor } from './code-index.processor';
import type { CodeIndexJob } from './code-index.types';

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

  beforeEach(async () => {
    codeSearch = createMock<CodeSearchService>();
    repositories = createMock<WorkspaceLocalRepositoriesService>();
    vi.mocked(codeSearch.isProviderConfigured).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CodeIndexProcessor,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
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

  it('throws when no embeddings provider is configured', async () => {
    vi.mocked(codeSearch.isProviderConfigured).mockReturnValue(false);
    await expect(processor.process(buildJob())).rejects.toThrow(
      'No embeddings provider configured',
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
      createMock<
        NonNullable<
          Awaited<
            ReturnType<WorkspaceLocalRepositoriesService['findByIdForUser']>
          >
        >
      >({ filesystemPath: '/Users/dev/repo' }),
    );
    vi.mocked(codeSearch.indexCodeWorkspace).mockResolvedValue({
      deletedPaths: 3,
      embedded: 42,
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
    });
  });
});
