import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  AppendPlanOutputDocument,
  GetPlanDocument,
  GetTasksByPlanIdDocument,
} from '../../__generated__/graphql.ts';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphCommandResult,
  WorkflowRalphCommandRunner,
} from '../../contract/ralph-orchestrator-deps.ts';
import { finalizePlanRun } from '../finalize-plan-run.ts';
import {
  PLAN_RUN_BODY_CLOSE_MARKER,
  PLAN_RUN_BODY_OPEN_MARKER,
} from '../plan-run-pr-body.ts';

const PLAN_ID = '1f4ba44f-8bb8-407c-a0f2-a4bb1f352278';
const BRANCH = 'openthrottle/plan-1f4ba44f';
const HEAD_SHA = 'deadbeef0123456789abcdef0123456789abcdef';
const TASK_DONE_WITH_COMMIT = '11111111-1111-4111-8111-111111111111';
const TASK_DONE_NO_COMMIT = '22222222-2222-4222-8222-222222222222';
const TASK_BLOCKED = '33333333-3333-4333-8333-333333333333';
const TASK_ON_MAIN = '44444444-4444-4444-8444-444444444444';
const TEMPLATE =
  '# Summary\n\n**TODO:** Describe the changes in this PR.\n\n## Testing\n\n- [ ] Pipelines should be passing\n- [ ] **TODO:** Provide steps to test the changes fully\n';

/** Twenty commits already on main sit below the branch's single commit. */
const BASE_COMMITS = Array.from(
  { length: 20 },
  (_, index) =>
    `b${String(index).padStart(6, '0')} feat: landed on main #${600 + index}`,
);
const BRANCH_COMMIT =
  'a1b2c3d fix(openthrottle-agentic-ralph): settle the repo';

function asExecuteGraphqlV2(
  impl: (document: unknown, variables?: unknown) => Promise<unknown>,
): WorkflowExecuteGraphqlV2;
function asExecuteGraphqlV2(impl: unknown): unknown {
  return impl;
}

const ok = (stdout = ''): WorkflowRalphCommandResult => ({
  exitCode: 0,
  stderr: '',
  stdout,
});

const createCwdWithTemplate = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'ralph-finalize-'));
  await mkdir(join(cwd, '.github'), { recursive: true });
  await mkdir(join(cwd, 'scripts'), { recursive: true });
  await writeFile(
    join(cwd, '.github', 'pull_request_template.md'),
    TEMPLATE,
    'utf8',
  );
  await writeFile(
    join(cwd, 'scripts', 'check-pr-attribution.sh'),
    '#!/bin/sh\nexit 0\n',
    'utf8',
  );

  return cwd;
};

const createExecuteGraphqlV2 = (appendCalls: unknown[]) =>
  asExecuteGraphqlV2(async (document, variables) => {
    if (document === AppendPlanOutputDocument) {
      appendCalls.push(variables);
      return { appendPlanOutput: { id: 'chunk-1' } };
    }
    if (document === GetPlanDocument) {
      return {
        plan: {
          description: '## Problem\n\nPlan-run PRs list commits from main.',
          id: PLAN_ID,
          summary: null,
          title: 'Settle the repo after a plan run',
        },
      };
    }
    if (document === GetTasksByPlanIdDocument) {
      return {
        tasksByPlanId: [
          {
            createdAt: '2026-11-01T00:00:00.000Z',
            id: TASK_DONE_WITH_COMMIT,
            sortOrder: 1000,
            status: 'COMPLETED',
            summary:
              'Run settle against a fresh worktree and confirm the repo id.',
            title: 'Settle the repo',
          },
          {
            createdAt: '2026-11-01T00:00:01.000Z',
            id: TASK_DONE_NO_COMMIT,
            sortOrder: 2000,
            status: 'COMPLETED',
            summary: null,
            title: 'Verify in a live run',
          },
          {
            createdAt: '2026-11-01T00:00:02.000Z',
            id: TASK_BLOCKED,
            sortOrder: 3000,
            status: 'BLOCKED',
            summary: 'Needs a human to approve the token scope.',
            title: 'Rotate the token',
          },
          {
            createdAt: '2026-11-01T00:00:03.000Z',
            id: TASK_ON_MAIN,
            sortOrder: 4000,
            status: 'COMPLETED',
            summary: null,
            title: 'Landed earlier',
          },
        ],
      };
    }
    throw new Error('unexpected document');
  });

interface StubOptions {
  readonly aheadCount: string;
  readonly attribution?: WorkflowRalphCommandResult;
  readonly existingPrs?: string;
  readonly push?: WorkflowRalphCommandResult;
  readonly remoteBase?: boolean;
}

/**
 * Stub git/gh. `git log` honours the range: without `<base>..HEAD` it returns the branch commit
 * plus the 20 below it, which is what `git log -20` used to paste into the body.
 */
const createRunCommand = (
  options: StubOptions,
  onGh: (
    args: readonly string[],
  ) => WorkflowRalphCommandResult | undefined = () => undefined,
) =>
  vi.fn<WorkflowRalphCommandRunner>(async ({ args, command }) => {
    if (command === 'git') {
      const [sub, first] = args;
      if (sub === 'rev-parse' && first === '--abbrev-ref') {
        return ok(`${BRANCH}\n`);
      }
      if (sub === 'rev-parse' && first === '--verify') {
        return options.remoteBase === false
          ? { exitCode: 1, stderr: '', stdout: '' }
          : ok(`${'c'.repeat(40)}\n`);
      }
      if (sub === 'rev-parse' && first === 'HEAD') {
        return ok(`${HEAD_SHA}\n`);
      }
      if (sub === 'fetch') {
        return ok();
      }
      if (sub === 'rev-list') {
        return ok(`${options.aheadCount}\n`);
      }
      if (sub === 'push') {
        return options.push ?? ok();
      }
      if (sub === 'log') {
        const ranged = args.some((arg) => arg.endsWith('..HEAD'));
        if (args.includes('--format=%b') && ranged) {
          return ok(`Plan-Id: ${PLAN_ID}\nTask-Id: ${TASK_DONE_WITH_COMMIT}\n`);
        }
        if (args.includes('--format=%b')) {
          return ok(`Plan-Id: ${PLAN_ID}\nTask-Id: ${TASK_ON_MAIN}\n`);
        }
        return ranged
          ? ok(`${BRANCH_COMMIT}\n`)
          : ok(`${[BRANCH_COMMIT, ...BASE_COMMITS].join('\n')}\n`);
      }
    }
    if (command === 'bash' && args[0]?.endsWith('check-pr-attribution.sh')) {
      return options.attribution ?? ok();
    }
    if (command === 'gh' && args[0] === 'pr' && args[1] === 'list') {
      return ok(options.existingPrs ?? '[]\n');
    }
    if (command === 'gh') {
      const handled = onGh(args);
      if (handled !== undefined) {
        return handled;
      }
    }
    throw new Error(`unexpected ${command} ${args.join(' ')}`);
  });

describe('finalizePlanRun', () => {
  it('skips push and PR when the branch has no commits ahead of the base', async () => {
    const cwd = await createCwdWithTemplate();
    const appendCalls: unknown[] = [];
    const runCommand = createRunCommand({ aheadCount: '0' });

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
      onChunk: undefined,
      planId: PLAN_ID,
      priorReason: 'workflow_complete',
      runCommand,
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_complete',
      status: 'finished',
    });
    expect(runCommand).not.toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining(['push']),
      }),
    );
    expect(appendCalls).toHaveLength(1);
  });

  it('compares against a freshly fetched origin/<base>, not the local base', async () => {
    const cwd = await createCwdWithTemplate();
    const runCommand = createRunCommand({ aheadCount: '0' });

    await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2: createExecuteGraphqlV2([]),
      onChunk: undefined,
      planId: PLAN_ID,
      priorReason: 'workflow_complete',
      runCommand,
    });

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({ args: ['fetch', 'origin', 'main'] }),
    );
    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['rev-list', '--count', 'origin/main..HEAD'],
      }),
    );
  });

  it('falls back to the local base when origin/<base> does not resolve', async () => {
    const cwd = await createCwdWithTemplate();
    const runCommand = createRunCommand({ aheadCount: '0', remoteBase: false });

    await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2: createExecuteGraphqlV2([]),
      onChunk: undefined,
      planId: PLAN_ID,
      priorReason: 'workflow_complete',
      runCommand,
    });

    expect(runCommand).toHaveBeenCalledWith(
      expect.objectContaining({ args: ['rev-list', '--count', 'main..HEAD'] }),
    );
  });

  describe('when no PR exists', () => {
    const run = async () => {
      const cwd = await createCwdWithTemplate();
      const created: { body: string; title: string } = { body: '', title: '' };
      const runCommand = createRunCommand({ aheadCount: '1' }, (args) => {
        if (args[1] === 'create') {
          expect(args).toContain('--draft');
          created.title = args[args.indexOf('--title') + 1] ?? '';
          return ok('https://github.com/OpenThrottle/monorepo/pull/42\n');
        }
        if (args[1] === 'view') {
          return ok('42\n');
        }
        if (args[1] === 'ready') {
          expect(args).toEqual(['pr', 'ready', '42']);
          return ok();
        }
        return undefined;
      });

      const result = await finalizePlanRun({
        baseBranch: 'main',
        cwd,
        executeGraphqlV2: createExecuteGraphqlV2([]),
        onChunk: undefined,
        planId: PLAN_ID,
        priorReason: 'workflow_tasks_exhausted',
        runCommand,
      });

      const createCall = runCommand.mock.calls.find(
        ([call]) => call.command === 'gh' && call.args[1] === 'create',
      );
      const bodyFile =
        createCall?.[0].args[createCall[0].args.indexOf('--body-file') + 1];
      created.body =
        bodyFile === undefined ? '' : await readFile(bodyFile, 'utf8');

      return { created, result, runCommand };
    };

    it('pushes, creates a draft PR, marks it ready, and returns settle artifacts', async () => {
      const { result, runCommand } = await run();

      expect(result).toEqual({
        exitCode: 0,
        headSha: HEAD_SHA,
        prNumber: 42,
        reason: 'workflow_tasks_exhausted',
        status: 'finished',
      });
      expect(runCommand).toHaveBeenCalledWith(
        expect.objectContaining({ args: ['push', '-u', 'origin', BRANCH] }),
      );
      expect(runCommand).not.toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['--no-verify']),
        }),
      );
    });

    it('lists only the branch commit, not the 20 base commits below it', async () => {
      const { created, runCommand } = await run();

      expect(runCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          args: ['log', '--oneline', '--no-decorate', 'origin/main..HEAD'],
        }),
      );
      expect(created.body).toContain('settle the repo (`a1b2c3d`)');
      expect(created.body).not.toContain('landed on main');
    });

    it('writes a Plan-Id and every delivered Task-Id, including tasks with no commit', async () => {
      const { created } = await run();

      expect(created.body).toContain(`Plan-Id: ${PLAN_ID}`);
      expect(created.body).toContain(`Task-Id: ${TASK_DONE_WITH_COMMIT}`);
      expect(created.body).toContain(`Task-Id: ${TASK_DONE_NO_COMMIT}`);
      expect(created.body).not.toContain(`Task-Id: ${TASK_BLOCKED}`);
      expect(created.body).not.toContain(`Task-Id: ${TASK_ON_MAIN}`);
    });

    it('describes the plan, lists blocked work, and never ships the TODO text', async () => {
      const { created } = await run();

      expect(created.body).toContain('**Settle the repo after a plan run**');
      expect(created.body).toContain('Plan-run PRs list commits from main.');
      expect(created.body).toContain('### Not delivered');
      expect(created.body).toContain('- Rotate the token (BLOCKED)');
      expect(created.body).toContain('- [ ] Check Settle the repo:');
      expect(created.body).toContain('- [ ] Pipelines should be passing');
      expect(created.body).not.toContain('TODO');
    });

    it('wraps the body in host markers and keeps the single-commit subject as the title', async () => {
      const { created } = await run();

      expect(created.body.startsWith(`${PLAN_RUN_BODY_OPEN_MARKER}\n`)).toBe(
        true,
      );
      expect(created.body.trimEnd().endsWith(PLAN_RUN_BODY_CLOSE_MARKER)).toBe(
        true,
      );
      expect(created.title).toBe(
        'fix(openthrottle-agentic-ralph): settle the repo',
      );
    });
  });

  it('reuses an existing PR and marks it ready', async () => {
    const cwd = await createCwdWithTemplate();
    const runCommand = createRunCommand(
      { aheadCount: '1', existingPrs: '[{"number":99}]\n' },
      (args) => {
        if (args[1] === 'ready') {
          expect(args).toEqual(['pr', 'ready', '99']);
          return ok();
        }
        if (args[1] === 'create') {
          throw new Error('should not create a PR when one exists');
        }
        return undefined;
      },
    );

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2: createExecuteGraphqlV2([]),
      onChunk: undefined,
      planId: PLAN_ID,
      priorReason: 'workflow_complete',
      runCommand,
    });

    expect(result).toEqual({
      exitCode: 0,
      headSha: HEAD_SHA,
      prNumber: 99,
      reason: 'workflow_complete',
      status: 'finished',
    });
  });

  it('returns workflow_complete_handoff_owed when git push fails', async () => {
    const cwd = await createCwdWithTemplate();
    const appendCalls: unknown[] = [];
    const runCommand = createRunCommand({
      aheadCount: '1',
      push: {
        exitCode: 128,
        stderr: 'remote: Permission denied\n',
        stdout: '',
      },
    });

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
      onChunk: undefined,
      planId: PLAN_ID,
      priorReason: 'workflow_complete',
      runCommand,
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_complete_handoff_owed',
      status: 'finished',
    });
    expect(JSON.stringify(appendCalls)).toContain('git-push');
  });

  it('returns workflow_complete_handoff_owed when attribution check fails', async () => {
    const cwd = await createCwdWithTemplate();
    const appendCalls: unknown[] = [];
    const runCommand = createRunCommand({
      aheadCount: '1',
      attribution: {
        exitCode: 1,
        stderr: 'attribution: Co-authored-by forbidden\n',
        stdout: '',
      },
    });

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
      onChunk: undefined,
      planId: PLAN_ID,
      priorReason: 'workflow_complete',
      runCommand,
    });

    expect(result).toEqual({
      exitCode: 0,
      reason: 'workflow_complete_handoff_owed',
      status: 'finished',
    });
    expect(JSON.stringify(appendCalls)).toContain('pr-attribution');
  });
});
