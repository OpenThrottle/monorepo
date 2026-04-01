/**
 * @description Tests for child job: Ralph loop in worktree, branch/SHA, plan completion.
 */

import { spawn, spawnSync } from 'child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChildJobInput, ParentJobHandoff } from '../../types/worktree';
import { runChildJob } from '../child-job';

const mockConfig = { connectionString: 'postgres://localhost/cortex' };

vi.mock('@openthrottle/ai-mcp/src/cortex-server', () => ({
  getCortexPostgresConfig: vi.fn(() => mockConfig),
}));

const mockCortexState: {
  tasks: { status: string }[];
  updatePlanStatusCalls: string[];
} = {
  tasks: [],
  updatePlanStatusCalls: [],
};

vi.mock('../cortex-ralph', () => ({
  appendPlanOutput: vi.fn().mockResolvedValue(undefined),
  ensureCortexReachable: vi.fn().mockResolvedValue(undefined),
  getTasksByPlanId: vi
    .fn()
    .mockImplementation(async () => mockCortexState.tasks),
  updatePlanStatus: vi
    .fn()
    .mockImplementation(async (_config: unknown, planId: string) => {
      mockCortexState.updatePlanStatusCalls.push(planId);
      return {};
    }),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}));

/**
 * @description Creates a mock child process for spawn that emits the given stdout/stderr and then close(code, null).
 * Uses setImmediate so the close event runs after the implementation has registered its listener.
 */
function createMockRalphChild(behavior: {
  readonly status: number;
  readonly stdout?: string;
  readonly stderr?: string;
}): ReturnType<typeof spawn> {
  let closeListener: (
    code: number | null,
    signal: NodeJS.Signals | null,
  ) => void = () => {};
  const child = {
    kill: vi.fn(() => {
      (child as { killed: boolean }).killed = true;
    }),
    killed: false,
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      if (event === 'close') {
        closeListener = listener;
      }
      return child;
    }),
    once: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      if (event === 'close') {
        closeListener = listener;
      }
      return child;
    }),
    stderr: {
      on: vi.fn((ev: string, cb: (d: string) => void) => {
        if (ev === 'data') cb(behavior.stderr ?? '');
      }),
      setEncoding: vi.fn(),
    },
    stdout: {
      on: vi.fn((ev: string, cb: (d: string) => void) => {
        if (ev === 'data') cb(behavior.stdout ?? '');
      }),
      setEncoding: vi.fn(),
    },
  };

  setImmediate(() => closeListener(behavior.status, null));

  return child as unknown as ReturnType<typeof spawn>;
}

/**
 * @description Mock child that does not auto-close; emits close when kill() is called (for timeout/abort tests).
 */
function createMockRalphChildCloseOnKill(): ReturnType<typeof spawn> {
  let closeListener: (
    code: number | null,
    signal: NodeJS.Signals | null,
  ) => void = () => {};
  const child = {
    kill: vi.fn(() => {
      (child as { killed: boolean }).killed = true;
      closeListener(null, 'SIGTERM');
    }),
    killed: false,
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      if (event === 'close') {
        closeListener = listener as (
          code: number | null,
          signal: NodeJS.Signals | null,
        ) => void;
      }
      return child;
    }),
    once: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      if (event === 'close') {
        closeListener = listener as (
          code: number | null,
          signal: NodeJS.Signals | null,
        ) => void;
      }
      return child;
    }),
    stderr: { on: vi.fn(), setEncoding: vi.fn() },
    stdout: { on: vi.fn(), setEncoding: vi.fn() },
  };
  return child as unknown as ReturnType<typeof spawn>;
}

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'child-job-'));
}

function handoff(worktreePath: string): ParentJobHandoff {
  return {
    branchName: 'ralph/test-branch',
    targetId: 'wt1',
    worktreePath,
  };
}

describe('runChildJob', () => {
  afterEach(() => {
    vi.mocked(spawn).mockReset();
    vi.mocked(spawnSync).mockReset();
    mockCortexState.tasks = [];
    mockCortexState.updatePlanStatusCalls = [];
  });

  it('returns ok: false when Cortex config is missing', async () => {
    const cortexServer = await import('@openthrottle/ai-mcp/src/cortex-server');
    vi.mocked(cortexServer.getCortexPostgresConfig).mockReturnValueOnce(
      undefined,
    );

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
    };
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/Cortex is required/);
      }
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns ok: false when Ralph process exits non-zero', async () => {
    vi.mocked(spawn).mockReturnValue(
      createMockRalphChild({ status: 1, stderr: 'Ralph failed' }),
    );

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
    };
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/exited with code 1/);
        expect(result.stderr).toBe('Ralph failed');
      }
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns ok: true with branch and commitSha when Ralph succeeds and git returns branch/sha', async () => {
    const dir = createTempDir();
    const branchName = 'ralph/test-branch';
    const commitSha = 'abc123def456';

    vi.mocked(spawn).mockReturnValue(
      createMockRalphChild({ status: 0, stdout: '' }),
    );
    const spawnSyncRet = (stdout: string): ReturnType<typeof spawnSync> => ({
      error: undefined,
      output: [],
      pid: 0,
      signal: null,
      status: 0,
      stderr: '',
      stdout,
    });
    vi.mocked(spawnSync)
      .mockReturnValueOnce(spawnSyncRet(branchName))
      .mockReturnValueOnce(spawnSyncRet(commitSha));

    mockCortexState.tasks = [{ status: 'COMPLETED' }, { status: 'COMPLETED' }];

    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
    };
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.branchName).toBe(branchName);
        expect(result.commitSha).toBe(commitSha);
        expect(result.planCompleted).toBe(true);
      }
      const { updatePlanStatus } = await import('../cortex-ralph.js');
      expect(updatePlanStatus).toHaveBeenCalledWith(
        expect.anything(),
        '2f94f33c-562d-4a70-8c08-c6d9510317e5',
        'COMPLETED',
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns ok: false with reason "Ralph run timed out" when timeoutMs expires', async () => {
    vi.mocked(spawn).mockReturnValue(createMockRalphChildCloseOnKill());

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
      timeoutMs: 50,
    };
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Ralph run timed out');
      }
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns ok: false with reason "Ralph run was cancelled" when signal is aborted', async () => {
    vi.mocked(spawn).mockReturnValue(createMockRalphChildCloseOnKill());
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
      signal: controller.signal,
    };
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Ralph run was cancelled');
      }
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('invokes onChunk with stdout and stderr chunks while Ralph runs', async () => {
    vi.mocked(spawn).mockReturnValue(
      createMockRalphChild({ status: 0, stderr: 'err\n', stdout: 'out\n' }),
    );
    vi.mocked(spawnSync)
      .mockReturnValueOnce({
        error: undefined,
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: '',
        stdout: 'ralph/test-branch',
      } as ReturnType<typeof spawnSync>)
      .mockReturnValueOnce({
        error: undefined,
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: '',
        stdout: 'abc123def456',
      } as ReturnType<typeof spawnSync>);
    mockCortexState.tasks = [{ status: 'COMPLETED' }];

    const chunks: Array<{ stream: 'stdout' | 'stderr'; data: string }> = [];
    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      onChunk: (chunk) => chunks.push(chunk),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
    };
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(true);
      expect(chunks).toContainEqual({ data: 'out\n', stream: 'stdout' });
      expect(chunks).toContainEqual({ data: 'err\n', stream: 'stderr' });
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('calls appendPlanOutput for each chunk when streamToCortex is true', async () => {
    vi.mocked(spawn).mockReturnValue(
      createMockRalphChild({ status: 0, stderr: 'err\n', stdout: 'out\n' }),
    );
    vi.mocked(spawnSync)
      .mockReturnValueOnce({
        error: undefined,
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: '',
        stdout: 'ralph/test-branch',
      } as ReturnType<typeof spawnSync>)
      .mockReturnValueOnce({
        error: undefined,
        output: [],
        pid: 0,
        signal: null,
        status: 0,
        stderr: '',
        stdout: 'abc123def456',
      } as ReturnType<typeof spawnSync>);
    mockCortexState.tasks = [{ status: 'COMPLETED' }];

    const planId = '2f94f33c-562d-4a70-8c08-c6d9510317e5';
    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId,
      streamIteration: 3,
      streamToCortex: true,
    };
    const { appendPlanOutput } = await import('../cortex-ralph.js');
    vi.mocked(appendPlanOutput).mockClear();
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(true);
      expect(appendPlanOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: mockConfig.connectionString,
        }),
        planId,
        '[stdout] out\n',
        3,
      );
      expect(appendPlanOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: mockConfig.connectionString,
        }),
        planId,
        '[stderr] err\n',
        3,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns planCompleted: false when some tasks are not completed', async () => {
    const dir = createTempDir();
    const commitSha = 'abc123def456';

    vi.mocked(spawn).mockReturnValue(
      createMockRalphChild({ status: 0, stdout: '' }),
    );
    const spawnSyncRet = (stdout: string): ReturnType<typeof spawnSync> => ({
      error: undefined,
      output: [],
      pid: 0,
      signal: null,
      status: 0,
      stderr: '',
      stdout,
    });
    vi.mocked(spawnSync)
      .mockReturnValueOnce(spawnSyncRet('ralph/test-branch'))
      .mockReturnValueOnce(spawnSyncRet(commitSha));

    mockCortexState.tasks = [{ status: 'COMPLETED' }, { status: 'PENDING' }];

    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
    };
    const { updatePlanStatus } = await import('../cortex-ralph.js');
    vi.mocked(updatePlanStatus).mockClear();
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.planCompleted).toBe(false);
      }
      expect(updatePlanStatus).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
