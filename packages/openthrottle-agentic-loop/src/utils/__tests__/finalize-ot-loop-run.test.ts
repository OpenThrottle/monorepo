import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FinalizeOtLoopRunParams } from '../finalize-ot-loop-run.ts';
import { finalizeOtLoopRun } from '../finalize-ot-loop-run.ts';
import type { RemoteFixture } from './git-fixtures.ts';
import {
  commitFile,
  createRecordingGraphql,
  createRecordingRunner,
  createRemoteFixture,
  git,
  gitCalls,
} from './git-fixtures.ts';

const PLAN_ID = '8a529290-0000-4000-8000-000000000000';
const TASK_1 = '11111111-1111-4111-8111-111111111111';
const TASK_2 = '22222222-2222-4222-8222-222222222222';
const TASK_COMMITLESS = '33333333-3333-4333-8333-333333333333';
const TASK_4 = '44444444-4444-4444-8444-444444444444';

const footers = (...ids: string[]): string => {
  return `\n\nPlan-Id: ${PLAN_ID}\n${ids.map((id) => `Task-Id: ${id}`).join('\n')}`;
};

const commitTask = async (
  cwd: string,
  file: string,
  taskId: string,
): Promise<void> => {
  await commitFile(cwd, file, `feat(scope): add ${file}${footers(taskId)}`);
};

const prepareBranch = async (fixture: RemoteFixture): Promise<void> => {
  await commitTask(fixture.work, 'b.txt', TASK_1);
  await commitTask(fixture.work, 'c.txt', TASK_2);
};

const runFinalize = (
  fixture: RemoteFixture,
  overrides: Partial<FinalizeOtLoopRunParams> & {
    readonly runCommand: FinalizeOtLoopRunParams['runCommand'];
  },
) => {
  const graphql = createRecordingGraphql();
  const promise = finalizeOtLoopRun({
    baseBranch: 'main',
    cwd: fixture.work,
    draftDir: undefined,
    executeGraphqlV2: graphql.executeGraphqlV2,
    onChunk: undefined,
    outcome: 'complete',
    planId: PLAN_ID,
    squashSubject: undefined,
    taskIds: [TASK_1, TASK_2, TASK_COMMITLESS],
    ...overrides,
  });

  return { graphql, promise };
};

const pushes = (calls: readonly { args: readonly string[] }[]): string[][] => {
  return calls
    .filter((call) => call.args[0] === 'push')
    .map((call) => [...call.args]);
};

describe('finalizeOtLoopRun', () => {
  beforeEach(() => {
    vi.stubEnv('GIT_CONFIG_GLOBAL', '/dev/null');
    vi.stubEnv('GIT_CONFIG_SYSTEM', '/dev/null');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('stale origin/main (#589 / #590)', () => {
    it('shows a naive squash onto the fresh tip reverts the file main changed', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);
      await fixture.advanceMain('x.txt', 'x v2\n');
      await git(fixture.work, ['fetch', '-q', 'origin', 'main']);
      await git(fixture.work, ['reset', '--soft', 'origin/main']);
      await git(fixture.work, ['commit', '-q', '-m', 'feat: naive']);

      const touched = await git(fixture.work, [
        'diff',
        '--name-only',
        'origin/main',
        'HEAD',
      ]);

      expect(touched.split('\n')).toContain('x.txt');
      expect(await git(fixture.work, ['show', 'HEAD:x.txt'])).toBe('x v1');
    });

    it('fetches first, squashes onto the merge-base, rebases, and keeps main changes intact', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);

      const branchPoint = await git(fixture.work, ['rev-parse', 'origin/main']);
      const newMain = await fixture.advanceMain('x.txt', 'x v2\n');

      // The local remote-tracking ref is stale until finalize fetches.
      expect(await git(fixture.work, ['rev-parse', 'origin/main'])).toBe(
        branchPoint,
      );

      const { calls, runCommand } = createRecordingRunner();
      const { promise } = runFinalize(fixture, { runCommand });
      const result = await promise;

      expect(result).toMatchObject({
        prNumber: 7,
        reason: 'workflow_complete',
        status: 'finished',
      });
      expect(await git(fixture.work, ['rev-parse', 'origin/main'])).toBe(
        newMain,
      );

      const sha = await git(fixture.work, ['rev-parse', 'HEAD']);

      expect(
        await git(fixture.work, ['rev-list', '--count', `${newMain}..HEAD`]),
      ).toBe('1');
      expect(await git(fixture.work, ['rev-parse', 'HEAD~1'])).toBe(newMain);
      expect(
        (
          await git(fixture.work, ['diff', '--name-only', newMain, 'HEAD'])
        ).split('\n'),
      ).toEqual(['b.txt', 'c.txt']);
      expect(await git(fixture.work, ['show', 'HEAD:x.txt'])).toBe('x v2');
      expect(await git(fixture.origin, ['rev-parse', 'plan/loop'])).toBe(sha);

      const message = await git(fixture.work, ['log', '-1', '--format=%B']);

      expect(message.match(/^Plan-Id:/gm)).toHaveLength(1);
      expect(message).toContain(`Task-Id: ${TASK_1}`);
      expect(message).toContain(`Task-Id: ${TASK_2}`);
      expect(message).toContain(`Task-Id: ${TASK_COMMITLESS}`);
      expect(gitCalls(calls)[0]).toBe('rev-parse --abbrev-ref HEAD');
      expect(
        gitCalls(calls).findIndex((line) => line.startsWith('fetch origin')),
      ).toBeLessThan(
        gitCalls(calls).findIndex((line) => line.startsWith('reset --soft')),
      );
    });

    it('refuses when the squash diff touches files the branch never touched, and restores HEAD', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);

      const newMain = await fixture.advanceMain('x.txt', 'x v2\n');
      const before = await git(fixture.work, ['rev-parse', 'HEAD']);
      // Simulate the #590 bug: the squash base resolves to the newer main tip, not the merge-base.
      const { calls, runCommand } = createRecordingRunner((call) => {
        const isMergeBase =
          call.command === 'git' &&
          call.args[0] === 'merge-base' &&
          call.args[1] === 'HEAD';

        return Promise.resolve(
          isMergeBase
            ? { exitCode: 0, stderr: '', stdout: `${newMain}\n` }
            : undefined,
        );
      });
      const { graphql, promise } = runFinalize(fixture, { runCommand });
      const result = await promise;

      expect(result).toMatchObject({
        reason: 'workflow_complete_handoff_owed',
      });
      expect(graphql.outputs.join('')).toContain('step=squash-guard');
      expect(graphql.outputs.join('')).toContain('x.txt');
      expect(await git(fixture.work, ['rev-parse', 'HEAD'])).toBe(before);
      expect(await git(fixture.work, ['status', '--porcelain'])).toBe('');
      expect(pushes(calls)).toHaveLength(0);
    });
  });

  describe('push and PR', () => {
    it('pushes exactly once, opens a draft PR and never runs gh pr ready', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);

      const { calls, runCommand } = createRecordingRunner();
      const { promise } = runFinalize(fixture, { runCommand });

      await promise;

      const ghLines = calls
        .filter((call) => call.command === 'gh')
        .map((call) => call.args.join(' '));

      expect(pushes(calls)).toEqual([['push', '-u', 'origin', 'plan/loop']]);
      expect(ghLines.some((line) => line.startsWith('pr create --draft'))).toBe(
        true,
      );
      expect(ghLines.some((line) => line.startsWith('pr ready'))).toBe(false);
    });

    it('keeps the draft and reports tasks_blocked when a task is BLOCKED', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);

      const { calls, runCommand } = createRecordingRunner();
      const { promise } = runFinalize(fixture, {
        outcome: 'tasks_blocked',
        runCommand,
      });

      expect(await promise).toMatchObject({ reason: 'workflow_tasks_blocked' });
      expect(calls.some((call) => call.args[1] === 'ready')).toBe(false);
    });

    it('surfaces an owed-handoff line and leaves the worktree intact when the push fails', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);

      const { calls, runCommand } = createRecordingRunner((call) => {
        if (call.command === 'git' && call.args[0] === 'push') {
          return Promise.resolve({
            exitCode: 1,
            stderr: 'remote: denied',
            stdout: '',
          });
        }

        return Promise.resolve(undefined);
      });
      const { graphql, promise } = runFinalize(fixture, { runCommand });

      expect(await promise).toMatchObject({
        reason: 'workflow_complete_handoff_owed',
        status: 'finished',
      });
      expect(graphql.outputs.join('')).toContain(
        'finalize handoff owed: step=git-push',
      );
      expect(await git(fixture.work, ['status', '--porcelain'])).toBe('');
      expect(
        await git(fixture.work, ['rev-list', '--count', 'origin/main..HEAD']),
      ).toBe('1');
      expect(
        calls.some(
          (call) => call.command === 'gh' && call.args[1] === 'create',
        ),
      ).toBe(false);
    });

    it('surfaces an owed-handoff line when opening the PR fails', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);

      const { runCommand } = createRecordingRunner((call) => {
        if (call.command === 'gh' && call.args[1] === 'create') {
          return Promise.resolve({
            exitCode: 1,
            stderr: 'no auth',
            stdout: '',
          });
        }

        return Promise.resolve(undefined);
      });
      const { graphql, promise } = runFinalize(fixture, { runCommand });

      expect(await promise).toMatchObject({
        reason: 'workflow_complete_handoff_owed',
      });
      expect(graphql.outputs.join('')).toContain('step=pr-create');
      expect(await git(fixture.work, ['status', '--porcelain'])).toBe('');
    });

    it('owes the fetch step, without touching history, when origin cannot be fetched', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);

      const before = await git(fixture.work, ['rev-parse', 'HEAD']);
      const { calls, runCommand } = createRecordingRunner((call) => {
        if (call.command === 'git' && call.args[0] === 'fetch') {
          return Promise.resolve({
            exitCode: 128,
            stderr: 'offline',
            stdout: '',
          });
        }

        return Promise.resolve(undefined);
      });
      const { graphql, promise } = runFinalize(fixture, { runCommand });

      expect(await promise).toMatchObject({
        reason: 'workflow_complete_handoff_owed',
      });
      expect(graphql.outputs.join('')).toContain('step=git-fetch');
      expect(await git(fixture.work, ['rev-parse', 'HEAD'])).toBe(before);
      expect(gitCalls(calls).some((line) => line.startsWith('reset'))).toBe(
        false,
      );
    });
  });

  describe('re-run on an already-pushed branch', () => {
    it('squashes only the commits after origin/<branch> and fast-forwards', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);

      const first = createRecordingRunner();

      await runFinalize(fixture, { runCommand: first.runCommand }).promise;

      const pushedTip = await git(fixture.origin, ['rev-parse', 'plan/loop']);

      await commitTask(fixture.work, 'd.txt', TASK_4);
      await commitFile(fixture.work, 'e.txt', 'fix(scope): follow-up');

      const second = createRecordingRunner();
      const { promise } = runFinalize(fixture, {
        runCommand: second.runCommand,
        taskIds: [TASK_1, TASK_2, TASK_COMMITLESS, TASK_4],
      });

      expect(await promise).toMatchObject({ status: 'finished' });

      const newTip = await git(fixture.origin, ['rev-parse', 'plan/loop']);

      expect(newTip).not.toBe(pushedTip);
      expect(await git(fixture.work, ['rev-parse', 'HEAD~1'])).toBe(pushedTip);
      expect(
        await git(fixture.work, ['rev-list', '--count', `${pushedTip}..HEAD`]),
      ).toBe('1');
      expect(
        (
          await git(fixture.work, ['diff', '--name-only', pushedTip, 'HEAD'])
        ).split('\n'),
      ).toEqual(['d.txt', 'e.txt']);

      const message = await git(fixture.work, ['log', '-1', '--format=%B']);

      expect(message).toContain(`Task-Id: ${TASK_4}`);
      // Already pushed in the first squash: not re-claimed.
      expect(message).not.toContain(`Task-Id: ${TASK_1}`);
      expect(pushes(second.calls).flat()).not.toContain('--force');
      expect(pushes(second.calls).flat().join(' ')).not.toMatch(/force|\+/);
      expect(second.calls.some((call) => call.args[1] === 'ready')).toBe(false);
    });

    it('owes a handoff instead of force-pushing when the pushed branch diverged', async () => {
      const fixture = await createRemoteFixture();

      await prepareBranch(fixture);
      await runFinalize(fixture, {
        runCommand: createRecordingRunner().runCommand,
      }).promise;
      // Local history is rewritten (amend) so origin/plan/loop is no longer an ancestor.
      await git(fixture.work, [
        'commit',
        '-q',
        '--amend',
        '-m',
        'feat: rewritten',
      ]);

      const { calls, runCommand } = createRecordingRunner();
      const { graphql, promise } = runFinalize(fixture, { runCommand });

      expect(await promise).toMatchObject({
        reason: 'workflow_complete_handoff_owed',
      });
      expect(graphql.outputs.join('')).toContain('step=branch-diverged');
      expect(pushes(calls)).toHaveLength(0);
    });
  });
});
