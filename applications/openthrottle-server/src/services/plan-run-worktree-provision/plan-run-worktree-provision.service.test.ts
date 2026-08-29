/**
 * @description Unit tests for plan-run worktree provisioning: reuse an existing worktree, create
 * one through `pnpm run worktree:new` (forwarding the configured root), fail fast rather than fall
 * back to the base checkout, and serialize concurrent provisioning of the same name.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';

const { mockExecFile } = vi.hoisted(() => ({ mockExecFile: vi.fn() }));

vi.mock('node:child_process', () => ({ execFile: mockExecFile }));

import { PlanRunWorktreeProvisionService } from './plan-run-worktree-provision.service';

const BASE = '/Users/matt/Development/openthrottle';
const WORKTREE = '/Users/matt/Development/openthrottle-worktrees/plan-5e172b67';

/**
 * Answers one promisified execFile call: `git worktree list` yields `list`, everything else `stdout`.
 */
const respond = (options: {
  readonly failCreate?: Error & { stderr?: string };
  readonly list: string;
  readonly stdout?: string;
}): void => {
  mockExecFile.mockImplementation(
    (
      file: string,
      args: readonly string[],
      _options: unknown,
      callback: (
        error: Error | null,
        result?: { stderr: string; stdout: string },
      ) => void,
    ) => {
      if (file === 'git' && args.includes('list')) {
        callback(null, { stderr: '', stdout: options.list });
        return;
      }
      if (options.failCreate !== undefined) {
        callback(options.failCreate);
        return;
      }
      callback(null, { stderr: '', stdout: options.stdout ?? '' });
    },
  );
};

describe('PlanRunWorktreeProvisionService', () => {
  let service: PlanRunWorktreeProvisionService;

  beforeEach(() => {
    mockExecFile.mockReset();
    service = new PlanRunWorktreeProvisionService(createMock<LoggerService>());
  });

  it('reuses an existing worktree instead of recreating it', async () => {
    respond({ list: `worktree ${BASE}\n\nworktree ${WORKTREE}\n` });

    await expect(
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
    ).resolves.toBe(WORKTREE);

    expect(mockExecFile.mock.calls.some(([file]) => file === 'pnpm')).toBe(
      false,
    );
  });

  it('creates the worktree through worktree:new and returns the printed path', async () => {
    respond({ list: `worktree ${BASE}\n`, stdout: `${WORKTREE}\n` });

    await expect(
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
    ).resolves.toBe(WORKTREE);

    const createCall = mockExecFile.mock.calls.find(
      ([file]) => file === 'pnpm',
    );
    expect(createCall?.[1]).toEqual(['run', 'worktree:new', 'plan-5e172b67']);
  });

  it('throws with the script stderr rather than falling back to the base checkout', async () => {
    const failure: Error & { stderr?: string } = new Error('Command failed');
    failure.stderr = 'fatal: invalid reference';
    respond({ failCreate: failure, list: `worktree ${BASE}\n` });

    await expect(
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
    ).rejects.toThrow(/fatal: invalid reference/);
  });

  it('throws when the script prints no path', async () => {
    respond({ list: `worktree ${BASE}\n`, stdout: 'setup complete\n' });

    await expect(
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
    ).rejects.toThrow(/printed no worktree path/);
  });

  it('serializes concurrent provisioning of the same worktree name', async () => {
    respond({ list: `worktree ${BASE}\n`, stdout: `${WORKTREE}\n` });

    const [first, second] = await Promise.all([
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
    ]);

    expect(first).toBe(WORKTREE);
    expect(second).toBe(WORKTREE);
    expect(
      mockExecFile.mock.calls.filter(([file]) => file === 'pnpm'),
    ).toHaveLength(1);
  });
});
