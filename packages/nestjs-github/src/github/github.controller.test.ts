import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GitHubController } from './github.controller';
import { GitHubService } from './github.service';
import type { PullListItemDto } from './dto/pull-list-item.dto';

describe('GitHubController', () => {
  let controller: GitHubController;
  const listPulls = vi.fn();

  beforeEach(async () => {
    listPulls.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitHubController],
      providers: [
        {
          provide: GitHubService,
          useValue: { listPulls },
        },
      ],
    }).compile();

    controller = module.get(GitHubController);
  });

  test('forwards owner, repo, and default state to the service', async () => {
    const dtos: PullListItemDto[] = [];
    listPulls.mockResolvedValue(dtos);

    const result = await controller.listPulls('owner', 'repo');

    expect(listPulls).toHaveBeenCalledTimes(1);
    expect(listPulls).toHaveBeenCalledWith('owner', 'repo', {
      base: undefined,
      merged: undefined,
      state: 'open',
    });
    expect(result).toBe(dtos);
  });

  test('passes base branch and parsed merged=true filter through', async () => {
    listPulls.mockResolvedValue([]);

    await controller.listPulls('owner', 'repo', 'all', 'main', 'true');

    expect(listPulls).toHaveBeenCalledWith('owner', 'repo', {
      base: 'main',
      merged: true,
      state: 'all',
    });
  });

  test('parses merged=false (case-insensitive) into a false filter', async () => {
    listPulls.mockResolvedValue([]);

    await controller.listPulls('owner', 'repo', 'closed', undefined, 'FALSE');

    expect(listPulls).toHaveBeenCalledWith('owner', 'repo', {
      base: undefined,
      merged: false,
      state: 'closed',
    });
  });

  test('treats an empty merged value as no filter (undefined)', async () => {
    listPulls.mockResolvedValue([]);

    await controller.listPulls('owner', 'repo', 'open', undefined, '');

    expect(listPulls).toHaveBeenCalledWith('owner', 'repo', {
      base: undefined,
      merged: undefined,
      state: 'open',
    });
  });

  test('rejects an invalid state with a 400 and never calls the service', async () => {
    await expect(
      controller.listPulls('owner', 'repo', 'bogus' as 'all'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(listPulls).not.toHaveBeenCalled();
  });

  test('rejects an invalid merged value with a 400 and never calls the service', async () => {
    await expect(
      controller.listPulls('owner', 'repo', 'open', undefined, 'maybe'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(listPulls).not.toHaveBeenCalled();
  });
});
