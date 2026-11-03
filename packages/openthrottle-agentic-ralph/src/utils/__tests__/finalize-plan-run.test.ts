import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { AppendPlanOutputDocument } from '../../__generated__/graphql.ts';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphCommandRunner,
} from '../../contract/ralph-orchestrator-deps.ts';
import { finalizePlanRun } from '../finalize-plan-run.ts';

const PLAN_ID = '1f4ba44f-8bb8-407c-a0f2-a4bb1f352278';
const BRANCH = 'openthrottle/plan-1f4ba44f';
const HEAD_SHA = 'deadbeef0123456789abcdef0123456789abcdef';

function asExecuteGraphqlV2(
  impl: (document: unknown, variables?: unknown) => Promise<unknown>,
): WorkflowExecuteGraphqlV2;
function asExecuteGraphqlV2(impl: unknown): unknown {
  return impl;
}

const createCwdWithTemplate = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'ralph-finalize-'));
  await mkdir(join(cwd, '.github'), { recursive: true });
  await mkdir(join(cwd, 'scripts'), { recursive: true });
  await writeFile(
    join(cwd, '.github', 'pull_request_template.md'),
    '# Summary\n\n**TODO:** Describe the changes in this PR.\n\n## Testing\n\n- [ ] Pipelines should be passing\n',
    'utf8',
  );
  await writeFile(
    join(cwd, 'scripts', 'check-pr-attribution.sh'),
    '#!/bin/sh\nexit 0\n',
    'utf8',
  );

  return cwd;
};

describe('finalizePlanRun', () => {
  it('skips push and PR when the branch has no commits ahead of the base', async () => {
    const cwd = await createCwdWithTemplate();
    const appendCalls: unknown[] = [];
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      if (document === AppendPlanOutputDocument) {
        appendCalls.push(variables);
        return { appendPlanOutput: { id: 'chunk-1' } };
      }
      throw new Error('unexpected document');
    });

    const runCommand: WorkflowRalphCommandRunner = vi.fn(
      async ({ args, command }) => {
        if (
          command === 'git' &&
          args[0] === 'rev-parse' &&
          args[1] === '--abbrev-ref'
        ) {
          return { exitCode: 0, stderr: '', stdout: `${BRANCH}\n` };
        }
        if (command === 'git' && args[0] === 'rev-list') {
          return { exitCode: 0, stderr: '', stdout: '0\n' };
        }
        throw new Error(`unexpected ${command} ${args.join(' ')}`);
      },
    );

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2,
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

  it('pushes, creates a new PR, marks it ready, and returns settle artifacts', async () => {
    const cwd = await createCwdWithTemplate();
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document) => {
      if (document === AppendPlanOutputDocument) {
        return { appendPlanOutput: { id: 'chunk-1' } };
      }
      throw new Error('unexpected document');
    });

    const runCommand: WorkflowRalphCommandRunner = vi.fn(
      async ({ args, command }) => {
        if (
          command === 'git' &&
          args[0] === 'rev-parse' &&
          args[1] === '--abbrev-ref'
        ) {
          return { exitCode: 0, stderr: '', stdout: `${BRANCH}\n` };
        }
        if (command === 'git' && args[0] === 'rev-list') {
          return { exitCode: 0, stderr: '', stdout: '2\n' };
        }
        if (command === 'git' && args[0] === 'push') {
          expect(args).toEqual(['push', '-u', 'origin', BRANCH]);
          expect(args).not.toContain('--no-verify');
          return { exitCode: 0, stderr: '', stdout: '' };
        }
        if (
          command === 'git' &&
          args[0] === 'rev-parse' &&
          args[1] === 'HEAD'
        ) {
          return { exitCode: 0, stderr: '', stdout: `${HEAD_SHA}\n` };
        }
        if (command === 'gh' && args[0] === 'pr' && args[1] === 'list') {
          return { exitCode: 0, stderr: '', stdout: '[]\n' };
        }
        if (command === 'git' && args[0] === 'log') {
          return {
            exitCode: 0,
            stderr: '',
            stdout: 'feat: ship the thing\n',
          };
        }
        if (
          command === 'bash' &&
          args[0]?.endsWith('check-pr-attribution.sh')
        ) {
          return { exitCode: 0, stderr: '', stdout: '' };
        }
        if (command === 'gh' && args[0] === 'pr' && args[1] === 'create') {
          expect(args).toContain('--draft');
          return {
            exitCode: 0,
            stderr: '',
            stdout: 'https://github.com/OpenThrottle/monorepo/pull/42\n',
          };
        }
        if (command === 'gh' && args[0] === 'pr' && args[1] === 'view') {
          return { exitCode: 0, stderr: '', stdout: '42\n' };
        }
        if (command === 'gh' && args[0] === 'pr' && args[1] === 'ready') {
          expect(args).toEqual(['pr', 'ready', '42']);
          return { exitCode: 0, stderr: '', stdout: '' };
        }
        throw new Error(`unexpected ${command} ${args.join(' ')}`);
      },
    );

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2,
      onChunk: undefined,
      planId: PLAN_ID,
      priorReason: 'workflow_tasks_exhausted',
      runCommand,
    });

    expect(result).toEqual({
      exitCode: 0,
      headSha: HEAD_SHA,
      prNumber: 42,
      reason: 'workflow_tasks_exhausted',
      status: 'finished',
    });
  });

  it('reuses an existing PR and marks it ready', async () => {
    const cwd = await createCwdWithTemplate();
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document) => {
      if (document === AppendPlanOutputDocument) {
        return { appendPlanOutput: { id: 'chunk-1' } };
      }
      throw new Error('unexpected document');
    });

    const runCommand: WorkflowRalphCommandRunner = vi.fn(
      async ({ args, command }) => {
        if (
          command === 'git' &&
          args[0] === 'rev-parse' &&
          args[1] === '--abbrev-ref'
        ) {
          return { exitCode: 0, stderr: '', stdout: `${BRANCH}\n` };
        }
        if (command === 'git' && args[0] === 'rev-list') {
          return { exitCode: 0, stderr: '', stdout: '1\n' };
        }
        if (command === 'git' && args[0] === 'push') {
          return { exitCode: 0, stderr: '', stdout: '' };
        }
        if (
          command === 'git' &&
          args[0] === 'rev-parse' &&
          args[1] === 'HEAD'
        ) {
          return { exitCode: 0, stderr: '', stdout: `${HEAD_SHA}\n` };
        }
        if (command === 'gh' && args[0] === 'pr' && args[1] === 'list') {
          return {
            exitCode: 0,
            stderr: '',
            stdout: '[{"number":99}]\n',
          };
        }
        if (command === 'gh' && args[0] === 'pr' && args[1] === 'ready') {
          expect(args).toEqual(['pr', 'ready', '99']);
          return { exitCode: 0, stderr: '', stdout: '' };
        }
        if (command === 'gh' && args[0] === 'pr' && args[1] === 'create') {
          throw new Error('should not create a PR when one exists');
        }
        throw new Error(`unexpected ${command} ${args.join(' ')}`);
      },
    );

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2,
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
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      if (document === AppendPlanOutputDocument) {
        appendCalls.push(variables);
        return { appendPlanOutput: { id: 'chunk-1' } };
      }
      throw new Error('unexpected document');
    });

    const runCommand: WorkflowRalphCommandRunner = vi.fn(
      async ({ args, command }) => {
        if (
          command === 'git' &&
          args[0] === 'rev-parse' &&
          args[1] === '--abbrev-ref'
        ) {
          return { exitCode: 0, stderr: '', stdout: `${BRANCH}\n` };
        }
        if (command === 'git' && args[0] === 'rev-list') {
          return { exitCode: 0, stderr: '', stdout: '1\n' };
        }
        if (command === 'git' && args[0] === 'push') {
          return {
            exitCode: 128,
            stderr: 'remote: Permission denied\n',
            stdout: '',
          };
        }
        throw new Error(`unexpected ${command} ${args.join(' ')}`);
      },
    );

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2,
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
    const executeGraphqlV2 = asExecuteGraphqlV2(async (document, variables) => {
      if (document === AppendPlanOutputDocument) {
        appendCalls.push(variables);
        return { appendPlanOutput: { id: 'chunk-1' } };
      }
      throw new Error('unexpected document');
    });

    const runCommand: WorkflowRalphCommandRunner = vi.fn(
      async ({ args, command }) => {
        if (
          command === 'git' &&
          args[0] === 'rev-parse' &&
          args[1] === '--abbrev-ref'
        ) {
          return { exitCode: 0, stderr: '', stdout: `${BRANCH}\n` };
        }
        if (command === 'git' && args[0] === 'rev-list') {
          return { exitCode: 0, stderr: '', stdout: '1\n' };
        }
        if (command === 'git' && args[0] === 'push') {
          return { exitCode: 0, stderr: '', stdout: '' };
        }
        if (
          command === 'git' &&
          args[0] === 'rev-parse' &&
          args[1] === 'HEAD'
        ) {
          return { exitCode: 0, stderr: '', stdout: `${HEAD_SHA}\n` };
        }
        if (command === 'gh' && args[0] === 'pr' && args[1] === 'list') {
          return { exitCode: 0, stderr: '', stdout: '[]\n' };
        }
        if (command === 'git' && args[0] === 'log') {
          return { exitCode: 0, stderr: '', stdout: 'feat: ok\n' };
        }
        if (
          command === 'bash' &&
          args[0]?.endsWith('check-pr-attribution.sh')
        ) {
          return {
            exitCode: 1,
            stderr: 'attribution: Co-authored-by forbidden\n',
            stdout: '',
          };
        }
        throw new Error(`unexpected ${command} ${args.join(' ')}`);
      },
    );

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      executeGraphqlV2,
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
