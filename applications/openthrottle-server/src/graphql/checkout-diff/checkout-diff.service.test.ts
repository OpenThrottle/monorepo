import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckoutPathService } from '../../services/checkout-path/checkout-path.service.ts';
import { SourceControlService } from '../../services/source-control/source-control.service.ts';
import type { SourceControlForge } from '../../services/source-control/source-control.types.ts';
import { CheckoutDiffService } from './checkout-diff.service.ts';
import { CheckoutDiffGitService } from './checkout-diff-git/checkout-diff-git.service.ts';
import type { GitRunResult } from './checkout-diff-git/checkout-diff-git.types.ts';

const ok = (stdout: string): GitRunResult => {
  return { ok: true, stdout };
};
const failed: GitRunResult = { ok: false, stdout: '' };

/** A scripted git: the first rule whose prefix matches the argv answers. */
function scriptGit(rules: ReadonlyArray<readonly [string, GitRunResult]>) {
  return (_root: string, args: readonly string[]): Promise<GitRunResult> => {
    const line = args.join(' ');
    const hit = rules.find(([prefix]) => line.startsWith(prefix));

    return Promise.resolve(hit === undefined ? failed : hit[1]);
  };
}

const HEALTHY_GIT = [
  ['rev-parse --is-inside-work-tree', ok('true\n')],
  ['symbolic-ref', ok('origin/main\n')],
  ['rev-parse --verify', ok('abc\n')],
  ['merge-base', ok('mergebase1\n')],
  ['branch --show-current', ok('feat/x\n')],
  ['diff --no-color --no-ext-diff -M --numstat', ok('3\t1\ta.ts\0')],
  ['diff --no-color --no-ext-diff -M --name-status', ok('M\0a.ts\0')],
  ['ls-files', ok('new.ts\0')],
  ['remote get-url', ok('git@github.com:acme/repo.git\n')],
] as const;

describe('CheckoutDiffService', () => {
  let service: CheckoutDiffService;
  let checkoutPath: ReturnType<typeof createMock<CheckoutPathService>>;
  let git: ReturnType<typeof createMock<CheckoutDiffGitService>>;
  let sourceControl: ReturnType<typeof createMock<SourceControlService>>;

  beforeEach(async () => {
    checkoutPath = createMock<CheckoutPathService>();
    git = createMock<CheckoutDiffGitService>();
    sourceControl = createMock<SourceControlService>();
    checkoutPath.resolve.mockResolvedValue({ path: '/repo' });
    git.run.mockImplementation(scriptGit(HEALTHY_GIT));
    git.readWorkingFile.mockResolvedValue({ kind: 'text', text: 'x\ny\n' });
    sourceControl.parseRemote.mockReturnValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        CheckoutDiffService,
        { provide: CheckoutPathService, useValue: checkoutPath },
        { provide: CheckoutDiffGitService, useValue: git },
        { provide: SourceControlService, useValue: sourceControl },
      ],
    }).compile();

    service = moduleRef.get(CheckoutDiffService);
  });

  describe('diff', () => {
    it('scopes the checkout lookup to the user', async () => {
      await service.diff('user-1', 'checkout-1');

      expect(checkoutPath.resolve).toHaveBeenCalledWith({
        checkoutId: 'checkout-1',
        ownerUserId: 'user-1',
      });
    });

    it('lists tracked and untracked files with totals', async () => {
      const result = await service.diff('user-1', 'checkout-1');

      expect(result).toMatchObject({
        additions: 5,
        available: true,
        baseRef: 'origin/main',
        deletions: 1,
        headBranch: 'feat/x',
      });
      expect(result.files.map((file) => [file.path, file.status])).toEqual([
        ['a.ts', 'modified'],
        ['new.ts', 'added'],
      ]);
    });

    it('is unavailable when the checkout is not found', async () => {
      checkoutPath.resolve.mockResolvedValue({ error: 'not-found' });

      expect(await service.diff('user-1', 'nope')).toMatchObject({
        available: false,
        files: [],
        reason: 'Checkout not found.',
      });
    });

    it('is unavailable outside a git repository', async () => {
      git.run.mockImplementation(scriptGit([]));

      expect(await service.diff('user-1', 'c')).toMatchObject({
        available: false,
        reason: 'Not a git repository.',
      });
    });

    it('is unavailable when no base branch resolves', async () => {
      git.run.mockImplementation(
        scriptGit([['rev-parse --is-inside-work-tree', ok('true\n')]]),
      );

      expect(await service.diff('user-1', 'c')).toMatchObject({
        available: false,
        reason: 'No base branch found.',
      });
    });

    it('includes the pull request the forge knows for the branch', async () => {
      const findPullRequestForBranch = vi.fn().mockResolvedValue({
        mergeCommitSha: null,
        mergedAt: null,
        number: 7,
        state: 'open',
      });

      sourceControl.parseRemote.mockReturnValue({
        forge: 'github',
        fullName: 'acme/repo',
      });
      sourceControl.forge.mockReturnValue(
        createMock<SourceControlForge>({
          findPullRequestForBranch,
          pullRequestUrl: () => 'https://github.com/acme/repo/pull/7',
        }),
      );

      const result = await service.diff('user-1', 'c');

      expect(findPullRequestForBranch).toHaveBeenCalledWith(
        'acme/repo',
        'feat/x',
      );
      expect(result.pullRequest).toEqual({
        number: 7,
        state: 'open',
        url: 'https://github.com/acme/repo/pull/7',
      });
    });

    it('still returns the diff when the forge lookup fails', async () => {
      sourceControl.parseRemote.mockReturnValue({
        forge: 'github',
        fullName: 'acme/repo',
      });
      sourceControl.forge.mockReturnValue(
        createMock<SourceControlForge>({
          findPullRequestForBranch: vi.fn().mockRejectedValue(new Error('x')),
        }),
      );

      const result = await service.diff('user-1', 'c');

      expect(result.available).toBe(true);
      expect(result.pullRequest).toBeNull();
    });
  });

  describe('fileDiff', () => {
    it('rejects a path that escapes the checkout without touching git', async () => {
      const result = await service.fileDiff('user-1', 'c', '../secrets');

      expect(result.available).toBe(false);
      expect(git.run).not.toHaveBeenCalled();
    });

    it('rejects a path that is not part of the diff', async () => {
      const result = await service.fileDiff('user-1', 'c', 'other.ts');

      expect(result).toMatchObject({
        available: false,
        reason: 'That file is not part of the diff.',
      });
    });

    it('returns the git patch for a tracked file', async () => {
      git.run.mockImplementation(
        scriptGit([
          [
            'diff --no-color --no-ext-diff -M mergebase1 -- a.ts',
            ok('@@ patch'),
          ],
          ...HEALTHY_GIT,
        ]),
      );

      expect(await service.fileDiff('user-1', 'c', 'a.ts')).toMatchObject({
        available: true,
        patch: '@@ patch',
        truncated: false,
      });
    });

    it('synthesizes an added-file patch for an untracked file', async () => {
      const result = await service.fileDiff('user-1', 'c', 'new.ts');

      expect(result.patch).toContain('+++ b/new.ts');
      expect(result.patch).toContain('+x');
    });

    it('returns an empty patch for a binary file', async () => {
      git.readWorkingFile.mockResolvedValue({ kind: 'binary' });

      expect(await service.fileDiff('user-1', 'c', 'new.ts')).toMatchObject({
        available: true,
        binary: true,
        patch: '',
      });
    });
  });
});
