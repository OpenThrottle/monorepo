/**
 * @description Unit tests for plan-run worktree provisioning: reuse an existing worktree, create
 * one by exec'ing the resolved ot-worktree `create.sh` (never pnpm), fail fast rather than fall back
 * to the base checkout, name the searched ladder when no script resolves, and serialize concurrent
 * provisioning of the same name. The real-script path is covered by the sibling integration test.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { UnrecoverableError } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExecFile, mockResolveScript } = vi.hoisted(() => ({
  mockExecFile: vi.fn(),
  mockResolveScript: vi.fn(),
}));

vi.mock('node:child_process', () => ({ execFile: mockExecFile }));
vi.mock('../ot-worktree-script/ot-worktree-script.utils.ts', () => ({
  resolveOtWorktreeScript: mockResolveScript,
}));

import { PlanRunWorktreeProvisionService } from './plan-run-worktree-provision.service.ts';

const BASE = '/Users/matt/Development/openthrottle';
const WORKTREE = '/Users/matt/Development/openthrottle-worktrees/plan-5e172b67';
const CREATE_SCRIPT = '/opt/openthrottle/skills/ot-worktree/scripts/create.sh';

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
    mockResolveScript.mockReset();
    mockResolveScript.mockReturnValue({
      ok: true,
      rung: 'openthrottle-ssot',
      scriptPath: CREATE_SCRIPT,
    });
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

    expect(mockExecFile.mock.calls.some(([file]) => file === 'bash')).toBe(
      false,
    );
  });

  it('creates the worktree by exec-ing the resolved create.sh and returns the printed path', async () => {
    respond({ list: `worktree ${BASE}\n`, stdout: `${WORKTREE}\n` });

    await expect(
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
    ).resolves.toBe(WORKTREE);

    const createCall = mockExecFile.mock.calls.find(
      ([file]) => file === 'bash',
    );
    expect(createCall?.[1]).toEqual([CREATE_SCRIPT, 'plan-5e172b67']);
    expect(createCall?.[2]).toMatchObject({ cwd: BASE });
    expect(mockExecFile.mock.calls.some(([file]) => file === 'pnpm')).toBe(
      false,
    );
  });

  it('names the searched ladder when no create.sh resolves', async () => {
    respond({ list: `worktree ${BASE}\n` });
    mockResolveScript.mockReturnValue({
      ok: false,
      searched: [`${BASE}/skills/ot-worktree/scripts/create.sh`],
    });

    await expect(
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
    ).rejects.toThrow(/Searched, in order:\n {2}- .*skills\/ot-worktree/);
    expect(mockExecFile.mock.calls.some(([file]) => file === 'bash')).toBe(
      false,
    );
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

  it('fails a non-git base unrecoverably, naming the script, the base path and stderr', async () => {
    const failure: Error & { stderr?: string } = new Error(
      `Command failed: bash ${CREATE_SCRIPT} plan-5e172b67`,
    );
    failure.stderr = 'fatal: not a git repository';
    respond({ failCreate: failure, list: '' });

    const attempt = service.provision({
      baseCheckoutPath: BASE,
      worktreeName: 'plan-5e172b67',
    });

    await expect(attempt).rejects.toBeInstanceOf(UnrecoverableError);
    await expect(attempt).rejects.toThrow(
      new RegExp(
        `from ${BASE}: Command failed: bash ${CREATE_SCRIPT}.*\\nfatal: not a git repository`,
        's',
      ),
    );
  });

  it('keeps a killed create.sh (timeout) retryable', async () => {
    const failure: Error & { killed?: boolean; signal?: string } = new Error(
      'Command failed',
    );
    failure.killed = true;
    failure.signal = 'SIGTERM';
    respond({ failCreate: failure, list: `worktree ${BASE}\n` });

    const attempt = service.provision({
      baseCheckoutPath: BASE,
      worktreeName: 'plan-5e172b67',
    });

    await expect(attempt).rejects.toThrow(/Failed to provision worktree/);
    await expect(attempt).rejects.not.toBeInstanceOf(UnrecoverableError);
  });

  it('fails unrecoverably when no create.sh resolves', async () => {
    respond({ list: `worktree ${BASE}\n` });
    mockResolveScript.mockReturnValue({ ok: false, searched: [] });

    await expect(
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
    ).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it('throws when the script prints no path', async () => {
    respond({ list: `worktree ${BASE}\n`, stdout: 'setup complete\n' });

    await expect(
      service.provision({
        baseCheckoutPath: BASE,
        worktreeName: 'plan-5e172b67',
      }),
    ).rejects.toThrow(UnrecoverableError);
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
      mockExecFile.mock.calls.filter(([file]) => file === 'bash'),
    ).toHaveLength(1);
  });
});
