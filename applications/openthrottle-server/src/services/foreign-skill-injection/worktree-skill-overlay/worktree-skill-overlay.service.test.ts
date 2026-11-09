/**
 * @description The ot-worktree overlay against real temp repos: default on → overlay present and
 * `git status` clean; opted out → nothing written; a throwing materializer still resolves (the run
 * provisions via the SSOT rung); the toggle removes and re-adds it; the OT repo itself is skipped.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  RepositoryCheckout,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { FOREIGN_SKILL_LEDGER_DIR_ENV } from '@openthrottle/openthrottle-agentic-utils';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WORKTREE_SKILL_OVERLAY_STATUS } from './worktree-skill-overlay.constants.ts';
import { WorktreeSkillOverlayService } from './worktree-skill-overlay.service.ts';

const { mockEnsureMaterialized } = vi.hoisted(() => ({
  mockEnsureMaterialized: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();
  mockEnsureMaterialized.mockImplementation(actual.ensureMaterialized);
  return { ...actual, ensureMaterialized: mockEnsureMaterialized };
});

const OVERLAY_SKILL = join('.agents', 'skills', 'ot-worktree', 'SKILL.md');

describe('WorktreeSkillOverlayService', () => {
  let scratch: string;
  let repo: string;
  let findByUserAndPath: Mock<RepositoryCheckoutsService['findByUserAndPath']>;
  let findByRepositoryIdForUser: Mock<
    RepositoryCheckoutsService['findByRepositoryIdForUser']
  >;
  let service: WorktreeSkillOverlayService;

  const git = (...args: string[]): string => {
    return execFileSync('git', ['-C', repo, ...args], {
      encoding: 'utf8',
    }).trim();
  };

  const checkoutRow = (overlayEnabled: boolean): RepositoryCheckout => {
    return createMock<RepositoryCheckout>({
      filesystemPath: repo,
      worktreeSkillOverlayEnabled: overlayEnabled,
    });
  };

  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'ot-worktree-overlay-'));
    repo = join(scratch, 'widgets');
    mkdirSync(repo, { recursive: true });
    git('init', '-q');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    git('config', 'commit.gpgsign', 'false');
    writeFileSync(join(repo, 'README.md'), '# widgets\n');
    git('add', '.');
    git('commit', '-q', '-m', 'init');

    vi.stubEnv(FOREIGN_SKILL_LEDGER_DIR_ENV, join(scratch, 'ledgers'));

    findByUserAndPath = vi
      .fn<RepositoryCheckoutsService['findByUserAndPath']>()
      .mockResolvedValue(null);
    findByRepositoryIdForUser = vi
      .fn<RepositoryCheckoutsService['findByRepositoryIdForUser']>()
      .mockResolvedValue([]);
    service = new WorktreeSkillOverlayService(
      createMock<LoggerService>(),
      createMock<RepositoryCheckoutsService>({
        findByRepositoryIdForUser,
        findByUserAndPath,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(scratch, { force: true, recursive: true });
  });

  describe('when the checkout has not opted out (the default)', () => {
    it('materializes ot-worktree and leaves git status clean', async () => {
      const outcome = await service.ensureForBaseCheckout({
        actorUserId: 'user-1',
        baseCheckoutPath: repo,
      });

      expect(outcome).toMatchObject({
        injectedNames: ['ot-worktree'],
        status: WORKTREE_SKILL_OVERLAY_STATUS.APPLIED,
      });
      expect(existsSync(join(repo, OVERLAY_SKILL))).toBe(true);
      expect(git('status', '--porcelain')).toBe('');
    });

    it('treats an unresolvable acting user as on', async () => {
      const outcome = await service.ensureForBaseCheckout({
        actorUserId: null,
        baseCheckoutPath: repo,
      });

      expect(outcome.status).toBe(WORKTREE_SKILL_OVERLAY_STATUS.APPLIED);
      expect(findByUserAndPath).not.toHaveBeenCalled();
    });
  });

  describe('when the checkout has opted out', () => {
    it('writes nothing into the repo', async () => {
      findByUserAndPath.mockResolvedValue(checkoutRow(false));

      const outcome = await service.ensureForBaseCheckout({
        actorUserId: 'user-1',
        baseCheckoutPath: repo,
      });

      expect(outcome.status).toBe(WORKTREE_SKILL_OVERLAY_STATUS.OPTED_OUT);
      expect(existsSync(join(repo, '.agents'))).toBe(false);
      expect(git('status', '--porcelain', '--ignored')).toBe('');
    });
  });

  describe('when materializing throws', () => {
    it('resolves FAILED instead of throwing, so provisioning proceeds', async () => {
      mockEnsureMaterialized.mockImplementationOnce(() => {
        throw new Error('EACCES: permission denied');
      });

      const outcome = await service.ensureForBaseCheckout({
        actorUserId: 'user-1',
        baseCheckoutPath: repo,
      });

      expect(outcome).toMatchObject({
        reason: expect.stringContaining('EACCES'),
        status: WORKTREE_SKILL_OVERLAY_STATUS.FAILED,
      });
    });
  });

  describe('when the checkout is the OpenThrottle repo itself', () => {
    it('does nothing', async () => {
      const otRoot = join(import.meta.dirname, '../../../../../..');

      const outcome = await service.ensureForBaseCheckout({
        actorUserId: 'user-1',
        baseCheckoutPath: otRoot,
      });

      expect(outcome.status).toBe(WORKTREE_SKILL_OVERLAY_STATUS.NOT_FOREIGN);
    });
  });

  describe('when the base directory is not a git checkout', () => {
    it('writes nothing', async () => {
      const plain = join(scratch, 'not-a-repo');
      mkdirSync(plain, { recursive: true });

      const outcome = await service.ensureForBaseCheckout({
        actorUserId: 'user-1',
        baseCheckoutPath: plain,
      });

      expect(outcome.status).toBe(WORKTREE_SKILL_OVERLAY_STATUS.NOT_FOREIGN);
      expect(existsSync(join(plain, '.agents'))).toBe(false);
    });
  });

  describe('when the toggle is saved', () => {
    it('removes the overlay when turned off and restores it when turned on', async () => {
      findByRepositoryIdForUser.mockResolvedValue([checkoutRow(true)]);
      await service.ensureForBaseCheckout({
        actorUserId: 'user-1',
        baseCheckoutPath: repo,
      });

      await service.applyForRepository('user-1', 'repo-1', false);
      expect(existsSync(join(repo, OVERLAY_SKILL))).toBe(false);
      expect(git('status', '--porcelain', '--ignored')).toBe('');

      await service.applyForRepository('user-1', 'repo-1', true);
      expect(existsSync(join(repo, OVERLAY_SKILL))).toBe(true);
      expect(git('status', '--porcelain')).toBe('');
    });
  });
});
