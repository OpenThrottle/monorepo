/**
 * @description Tests for child job: Ralph loop in worktree, branch/SHA, plan completion.
 */

import type { WorkflowConfigDebug } from '@openthrottle/openthrottle-agentic-workflow';
import { spawn, spawnSync } from 'child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChildJobInput, ParentJobHandoff } from '../../types/worktree';
import { runChildJob } from '../child-job';

/**
 * @description Structural shape of the spawn child-process test doubles below. Declaring it
 * explicitly lets `kill`/`on` reference `child` in their closures without a circular-inference
 * cast, and {@link asMock} converts the finished double to the real `spawn` return type.
 */
interface MockRalphChildStream {
  on: (event: string, callback: (data: string) => void) => void;
  setEncoding: (encoding?: string) => void;
}
interface MockRalphChild {
  kill: (signal: NodeJS.Signals) => void;
  killed: boolean;
  on: (event: string, listener: (...args: unknown[]) => void) => MockRalphChild;
  once: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => MockRalphChild;
  stderr: MockRalphChildStream;
  stdout: MockRalphChildStream;
}

/** @description Presents a structural test double as the target type without a cast. */
function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

/**
 * @description Presents a legacy uppercase debug value (e.g. persisted `DEBUG`) as a
 * {@link WorkflowConfigDebug} so tests exercise runtime normalization without a cast.
 */
function legacyDebugValue(value: string): WorkflowConfigDebug;
function legacyDebugValue(value: string): string {
  return value;
}

/** @description Narrows spawn argv (a mixed args/options union) to the args array. */
function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

const mockConfig = {
  connectionString: 'postgres://localhost/openthrottle',
  transport: 'postgres-direct' as const,
};

const buildNestedWorkflowRalphSpawnEnvMock = vi.fn(
  (
    _spawnCwd: string,
    env: NodeJS.ProcessEnv,
    _options?: { canonicalPostgresUrl?: string },
  ) => env,
);

vi.mock('../../config/build-nested-workflow-ralph-spawn-env', () => ({
  buildNestedWorkflowRalphSpawnEnv: (
    spawnCwd: string,
    env: NodeJS.ProcessEnv,
    options?: { canonicalPostgresUrl?: string },
  ) => buildNestedWorkflowRalphSpawnEnvMock(spawnCwd, env, options),
}));

vi.mock('../../config/load-workflow-ralph-config', () => ({
  resolveWorkflowRalphTransport: vi.fn(() => 'postgres-direct'),
}));

const mockOpenThrottleState: {
  tasks: { status: string }[];
  updatePlanStatusCalls: string[];
} = {
  tasks: [],
  updatePlanStatusCalls: [],
};

vi.mock('../openthrottle-ralph', () => ({
  RALPH_FATAL_REQUIRED_GRAPHQL: 'graphql-required',
  RALPH_FATAL_REQUIRED_POSTGRES: 'postgres-required',
  appendPlanOutput: vi.fn().mockResolvedValue(undefined),
  ensureOpenThrottleReachable: vi.fn().mockResolvedValue(undefined),
  getTasksByPlanId: vi
    .fn()
    .mockImplementation(async () => mockOpenThrottleState.tasks),
  reconcilePlanCompletionIfAllTasksTerminal: vi
    .fn()
    .mockImplementation(async (_config: unknown, planId: string) => {
      const tasks = mockOpenThrottleState.tasks;
      const allDone =
        tasks.length > 0 &&
        tasks.every((t) => t.status === 'COMPLETED' || t.status === 'SKIPPED');
      if (allDone) {
        mockOpenThrottleState.updatePlanStatusCalls.push(planId);
      }
      return allDone;
    }),
  resolveWorkflowRalphConfig: vi.fn(() => mockConfig),
  updatePlanStatus: vi
    .fn()
    .mockImplementation(async (_config: unknown, planId: string) => {
      mockOpenThrottleState.updatePlanStatusCalls.push(planId);
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
  readonly stderr?: string;
  readonly stdout?: string;
}): ReturnType<typeof spawn> {
  let closeListener: (
    code: number | null,
    signal: NodeJS.Signals | null,
  ) => void = () => {};
  const child: MockRalphChild = {
    kill: vi.fn(() => {
      child.killed = true;
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

  return asMock<ReturnType<typeof spawn>>(child);
}

/**
 * @description Mock child that does not auto-close; emits close when kill() is called (for timeout/abort tests).
 */
function createMockRalphChildCloseOnKill(): ReturnType<typeof spawn> {
  let closeListener: (
    code: number | null,
    signal: NodeJS.Signals | null,
  ) => void = () => {};
  const child: MockRalphChild = {
    kill: vi.fn(() => {
      child.killed = true;
      closeListener(null, 'SIGTERM');
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
    stderr: { on: vi.fn(), setEncoding: vi.fn() },
    stdout: { on: vi.fn(), setEncoding: vi.fn() },
  };
  return asMock<ReturnType<typeof spawn>>(child);
}

/**
 * @description Like {@link createMockRalphChildCloseOnKill} but emits one stdout chunk (simulating mid-iteration output) before the process is killed on abort.
 */
function createMockRalphChildStreamingPartialThenCloseOnKill(): ReturnType<
  typeof spawn
> {
  let closeListener: (
    code: number | null,
    signal: NodeJS.Signals | null,
  ) => void = () => {};
  const child: MockRalphChild = {
    kill: vi.fn(() => {
      child.killed = true;
      closeListener(null, 'SIGTERM');
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
    stderr: { on: vi.fn(), setEncoding: vi.fn() },
    stdout: {
      on: vi.fn((ev: string, cb: (d: string) => void) => {
        if (ev === 'data') {
          setImmediate(() => {
            cb('partial output mid-iteration\n');
          });
        }
      }),
      setEncoding: vi.fn(),
    },
  };
  return asMock<ReturnType<typeof spawn>>(child);
}

/** Grace after SIGTERM before SIGKILL — must match `SIGKILL_GRACE_MS` in `child-job.ts`. */
const SIGKILL_GRACE_MS = 10_000;

/**
 * @description Like a child that ignores SIGTERM: stays alive until SIGKILL, matching Node (`killed` true after first kill).
 */
function createMockRalphChildIgnoresSigtermUntilSigkill(): ReturnType<
  typeof spawn
> {
  let closeListener: (
    code: number | null,
    signal: NodeJS.Signals | null,
  ) => void = () => {};
  const child: MockRalphChild = {
    kill: vi.fn((sig: NodeJS.Signals) => {
      child.killed = true;
      if (sig === 'SIGKILL') {
        closeListener(null, 'SIGKILL');
      }
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
    stderr: { on: vi.fn(), setEncoding: vi.fn() },
    stdout: { on: vi.fn(), setEncoding: vi.fn() },
  };
  return asMock<ReturnType<typeof spawn>>(child);
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
    buildNestedWorkflowRalphSpawnEnvMock.mockClear();
    mockOpenThrottleState.tasks = [];
    mockOpenThrottleState.updatePlanStatusCalls = [];
  });

  it('returns ok: false when OpenThrottle config is missing', async () => {
    const openthrottleRalph = await import('../openthrottle-ralph.js');
    vi.mocked(openthrottleRalph.resolveWorkflowRalphConfig).mockReturnValueOnce(
      null,
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
        expect(result.reason).toMatch(/postgres-required/);
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

    mockOpenThrottleState.tasks = [
      { status: 'COMPLETED' },
      { status: 'COMPLETED' },
    ];

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
      const { reconcilePlanCompletionIfAllTasksTerminal } =
        await import('../openthrottle-ralph.js');
      expect(reconcilePlanCompletionIfAllTasksTerminal).toHaveBeenCalledWith(
        expect.anything(),
        '2f94f33c-562d-4a70-8c08-c6d9510317e5',
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('passes --debug when ralphDebugCli is DEBUG (legacy uppercase)', async () => {
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
      .mockReturnValueOnce(spawnSyncRet('abc123def456'));

    mockOpenThrottleState.tasks = [{ status: 'COMPLETED' }];

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
      ralphDebugCli: legacyDebugValue('DEBUG'),
    };
    try {
      await runChildJob(input);
      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        [
          'exec',
          'workflow-ralph',
          '--plan',
          '2f94f33c-562d-4a70-8c08-c6d9510317e5',
          '--debug',
          '--worktree',
          'wt1',
        ],
        expect.objectContaining({ cwd: dir, shell: true }),
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('passes --verbose when ralphDebugCli is verbose', async () => {
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
      .mockReturnValueOnce(spawnSyncRet('abc123def456'));

    mockOpenThrottleState.tasks = [{ status: 'COMPLETED' }];

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
      ralphDebugCli: 'verbose',
    };
    try {
      await runChildJob(input);
      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        [
          'exec',
          'workflow-ralph',
          '--plan',
          '2f94f33c-562d-4a70-8c08-c6d9510317e5',
          '--verbose',
          '--worktree',
          'wt1',
        ],
        expect.objectContaining({ cwd: dir, shell: true }),
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('injects canonical OpenThrottle Postgres URL into nested spawn env when cwd is foreign (regression: Plan not found)', async () => {
    const canonicalUrl =
      'postgresql://worker:secret@db.example:5432/openthrottle';
    const foreignCwd = createTempDir();

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
      .mockReturnValueOnce(spawnSyncRet('abc123def456'));

    mockOpenThrottleState.tasks = [{ status: 'COMPLETED' }];

    const input: ChildJobInput = {
      canonicalPostgresUrl: canonicalUrl,
      handoff: handoff(foreignCwd),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
    };
    try {
      await runChildJob(input);

      expect(buildNestedWorkflowRalphSpawnEnvMock).toHaveBeenCalledWith(
        foreignCwd,
        process.env,
        {
          canonicalPostgresUrl: canonicalUrl,
        },
      );
      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        expect.arrayContaining([
          'exec',
          'workflow-ralph',
          '--plan',
          '2f94f33c-562d-4a70-8c08-c6d9510317e5',
        ]),
        expect.objectContaining({ cwd: foreignCwd, shell: true }),
      );
    } finally {
      rmSync(foreignCwd, { force: true, recursive: true });
    }
  });

  it('passes run-tuning flags to pnpm exec workflow-ralph', async () => {
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
      .mockReturnValueOnce(spawnSyncRet('abc123def456'));

    mockOpenThrottleState.tasks = [{ status: 'COMPLETED' }];

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      iterationTimeoutSeconds: 600,
      iterations: 5,
      model: 'gpt-5',
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
      project: 'my-app',
      prompt: '/agents/seo',
    };
    try {
      await runChildJob(input);
      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        [
          'exec',
          'workflow-ralph',
          '--plan',
          '2f94f33c-562d-4a70-8c08-c6d9510317e5',
          '--iterations',
          '5',
          '--prompt',
          '/agents/seo',
          '--model',
          'gpt-5',
          '--project',
          'my-app',
          '--iteration-timeout',
          '600',
          '--worktree',
          'wt1',
        ],
        expect.objectContaining({ cwd: dir, shell: true }),
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('defaults agent --worktree to handoff targetId when not overridden', async () => {
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
      .mockReturnValueOnce(spawnSyncRet('abc123def456'));

    mockOpenThrottleState.tasks = [{ status: 'COMPLETED' }];

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
    };
    try {
      await runChildJob(input);
      const argv = vi.mocked(spawn).mock.calls[0]?.[1];
      if (!isStringArray(argv)) {
        throw new Error('expected spawn argv array');
      }
      expect(argv).toContain('--worktree');
      expect(argv).toContain('wt1');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('forwards explicit worktree over handoff targetId', async () => {
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
      .mockReturnValueOnce(spawnSyncRet('abc123def456'));

    mockOpenThrottleState.tasks = [{ status: 'COMPLETED' }];

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
      worktree: 'custom-name',
    };
    try {
      await runChildJob(input);
      const argv = vi.mocked(spawn).mock.calls[0]?.[1];
      if (!isStringArray(argv)) {
        throw new Error('expected spawn argv array');
      }
      expect(argv).toEqual(
        expect.arrayContaining(['--worktree', 'custom-name']),
      );
      expect(argv).not.toContain('wt1');
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('forwards --prompt-file when promptFile is set (takes precedence over prompt)', async () => {
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
      .mockReturnValueOnce(spawnSyncRet('abc123def456'));

    mockOpenThrottleState.tasks = [{ status: 'COMPLETED' }];

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
      prompt: '/agents/seo',
      promptFile: '.cursor/skills/agents-ralph/SKILL.md',
    };
    try {
      await runChildJob(input);
      expect(spawn).toHaveBeenCalledWith(
        'pnpm',
        [
          'exec',
          'workflow-ralph',
          '--plan',
          '2f94f33c-562d-4a70-8c08-c6d9510317e5',
          '--prompt-file',
          '.cursor/skills/agents-ralph/SKILL.md',
          '--worktree',
          'wt1',
        ],
        expect.objectContaining({ cwd: dir, shell: true }),
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

  it('when aborted mid-stream with streamToOpenThrottle, partial stdout was appended and run ends cancelled', async () => {
    vi.mocked(spawn).mockReturnValue(
      createMockRalphChildStreamingPartialThenCloseOnKill(),
    );
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30);

    const planId = '2f94f33c-562d-4a70-8c08-c6d9510317e5';
    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId,
      signal: controller.signal,
      streamIteration: 4,
      streamToOpenThrottle: true,
    };
    const { appendPlanOutput } = await import('../openthrottle-ralph.js');
    vi.mocked(appendPlanOutput).mockClear();
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Ralph run was cancelled');
      }
      expect(appendPlanOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: mockConfig.connectionString,
        }),
        planId,
        '[stdout] partial output mid-iteration\n',
        4,
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('sends SIGTERM then SIGKILL after grace when child ignores SIGTERM (abort)', async () => {
    vi.useFakeTimers();
    const mockChild = createMockRalphChildIgnoresSigtermUntilSigkill();
    vi.mocked(spawn).mockReturnValue(mockChild);

    const controller = new AbortController();
    controller.abort();

    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
      signal: controller.signal,
    };
    try {
      const runPromise = runChildJob(input);
      await vi.advanceTimersByTimeAsync(SIGKILL_GRACE_MS);
      const result = await runPromise;
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('Ralph run was cancelled');
      }
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    } finally {
      vi.useRealTimers();
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('invokes onChunk with stdout and stderr chunks while Ralph runs', async () => {
    vi.mocked(spawn).mockReturnValue(
      createMockRalphChild({ status: 0, stderr: 'err\n', stdout: 'out\n' }),
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
      .mockReturnValueOnce(spawnSyncRet('abc123def456'));
    mockOpenThrottleState.tasks = [{ status: 'COMPLETED' }];

    const chunks: Array<{ data: string; stream: 'stdout' | 'stderr' }> = [];
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

  it('calls appendPlanOutput for each chunk when streamToOpenThrottle is true', async () => {
    vi.mocked(spawn).mockReturnValue(
      createMockRalphChild({ status: 0, stderr: 'err\n', stdout: 'out\n' }),
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
      .mockReturnValueOnce(spawnSyncRet('abc123def456'));
    mockOpenThrottleState.tasks = [{ status: 'COMPLETED' }];

    const planId = '2f94f33c-562d-4a70-8c08-c6d9510317e5';
    const dir = createTempDir();
    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId,
      streamIteration: 3,
      streamToOpenThrottle: true,
    };
    const { appendPlanOutput } = await import('../openthrottle-ralph.js');
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

    mockOpenThrottleState.tasks = [
      { status: 'COMPLETED' },
      { status: 'PENDING' },
    ];

    const input: ChildJobInput = {
      handoff: handoff(dir),
      planId: '2f94f33c-562d-4a70-8c08-c6d9510317e5',
    };
    mockOpenThrottleState.updatePlanStatusCalls = [];
    try {
      const result = await runChildJob(input);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.planCompleted).toBe(false);
      }
      expect(mockOpenThrottleState.updatePlanStatusCalls).toEqual([]);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
