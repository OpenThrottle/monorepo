import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphCommandResult,
  WorkflowRalphCommandRunner,
} from '@openthrottle/openthrottle-agentic-ralph';
import {
  AppendPlanOutputDocument,
  createDefaultWorkflowRalphCommandRunner,
} from '@openthrottle/openthrottle-agentic-ralph';

const execFileAsync = promisify(execFile);

/** Runs git in `cwd`, returning trimmed stdout; throws on a non-zero exit. */
export const git = async (
  cwd: string,
  args: readonly string[],
): Promise<string> => {
  const result = await execFileAsync('git', [...args], { cwd });

  return result.stdout.trim();
};

export const writeRepoFile = async (
  cwd: string,
  path: string,
  content: string,
): Promise<void> => {
  await mkdir(join(cwd, path, '..'), { recursive: true });
  await writeFile(join(cwd, path), content, 'utf8');
};

const configureIdentity = async (cwd: string): Promise<void> => {
  await git(cwd, ['config', 'user.email', 'loop@example.test']);
  await git(cwd, ['config', 'user.name', 'Loop Test']);
  await git(cwd, ['config', 'commit.gpgsign', 'false']);
  await git(cwd, ['config', 'core.hooksPath', '.git/hooks']);
};

/** A plain repository on `main` with one commit; no remote. */
export const createLocalRepo = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'ot-loop-repo-'));

  await git(root, ['init', '-q', '-b', 'main']);
  await configureIdentity(root);
  await writeRepoFile(root, 'README.md', 'base\n');
  await git(root, ['add', '-A']);
  await git(root, ['commit', '-q', '-m', 'chore: base']);

  return root;
};

export interface RemoteFixture {
  /** Lands a commit on origin's main from a second clone (this clone's origin/main goes stale). */
  readonly advanceMain: (file: string, content: string) => Promise<string>;
  readonly origin: string;
  readonly root: string;
  readonly work: string;
}

/**
 * @description A bare "origin" with `main` (a.txt, x.txt), a clone `work` on the run branch
 * `plan/loop`, and a helper that advances origin's main behind `work`'s back.
 */
export const createRemoteFixture = async (): Promise<RemoteFixture> => {
  const root = await mkdtemp(join(tmpdir(), 'ot-loop-remote-'));
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  const other = join(root, 'other');

  await git(root, ['init', '-q', '--bare', '-b', 'main', origin]);
  await git(root, ['clone', '-q', origin, work]);
  await configureIdentity(work);
  await git(work, ['checkout', '-q', '-B', 'main']);
  await writeRepoFile(work, 'a.txt', 'a\n');
  await writeRepoFile(work, 'x.txt', 'x v1\n');
  await git(work, ['add', '-A']);
  await git(work, ['commit', '-q', '-m', 'chore: seed main']);
  await git(work, ['push', '-q', '-u', 'origin', 'main']);
  await git(work, ['checkout', '-q', '-b', 'plan/loop']);

  const advanceMain = async (
    file: string,
    content: string,
  ): Promise<string> => {
    await git(root, ['clone', '-q', origin, other]).catch(() => undefined);
    await configureIdentity(other);
    await git(other, ['checkout', '-q', 'main']);
    await git(other, ['pull', '-q', 'origin', 'main']);
    await writeRepoFile(other, file, content);
    await git(other, ['add', '-A']);
    await git(other, ['commit', '-q', '-m', `fix: touch ${file}`]);
    await git(other, ['push', '-q', 'origin', 'main']);

    return git(other, ['rev-parse', 'HEAD']);
  };

  return { advanceMain, origin, root, work };
};

/** Commits one file with the given message on the current branch. */
export const commitFile = async (
  cwd: string,
  file: string,
  message: string,
): Promise<void> => {
  await writeRepoFile(cwd, file, `${message}\n`);
  await git(cwd, ['add', '-A']);
  await git(cwd, ['commit', '-q', '-m', message]);
};

const ok = (stdout = ''): WorkflowRalphCommandResult => {
  return { exitCode: 0, stderr: '', stdout };
};

export type CommandCall = Parameters<WorkflowRalphCommandRunner>[0];

export interface RecordingRunner {
  readonly calls: CommandCall[];
  readonly runCommand: WorkflowRalphCommandRunner;
}

/**
 * @description Real `git` over `execFile`, a fake `gh` and attribution script. Records every call;
 * `intercept` may answer a call first.
 */
export const createRecordingRunner = (
  intercept?: (
    call: CommandCall,
    real: WorkflowRalphCommandRunner,
  ) => Promise<WorkflowRalphCommandResult | undefined>,
): RecordingRunner => {
  const real = createDefaultWorkflowRalphCommandRunner();
  const calls: CommandCall[] = [];
  const runCommand: WorkflowRalphCommandRunner = async (call) => {
    calls.push(call);

    const answered = await intercept?.(call, real);

    if (answered !== undefined) {
      return answered;
    }

    if (call.command === 'bash') {
      return ok();
    }

    if (call.command === 'gh') {
      const verb = call.args.slice(0, 2).join(' ');

      if (verb === 'pr list') {
        return ok('[]');
      }

      if (verb === 'pr view') {
        return ok('7\n');
      }

      return ok();
    }

    return real(call);
  };

  return { calls, runCommand };
};

export interface RecordingGraphql {
  readonly executeGraphqlV2: WorkflowExecuteGraphqlV2;
  readonly outputs: string[];
}

function asExecute(
  impl: (document: unknown, variables?: unknown) => Promise<unknown>,
): WorkflowExecuteGraphqlV2;
function asExecute(impl: unknown): unknown {
  return impl;
}

/** plan_output appends are recorded; every other OT read fails (finalize treats those as best effort). */
export const createRecordingGraphql = (): RecordingGraphql => {
  const outputs: string[] = [];
  const executeGraphqlV2 = asExecute((document, variables) => {
    if (document === AppendPlanOutputDocument) {
      const hasInput =
        variables !== null &&
        typeof variables === 'object' &&
        'input' in variables;
      const input = hasInput ? variables.input : undefined;

      if (input !== null && typeof input === 'object' && 'content' in input) {
        outputs.push(String(input.content));
      }

      return Promise.resolve({});
    }

    return Promise.reject(new Error('offline'));
  });

  return { executeGraphqlV2, outputs };
};

export const gitCalls = (calls: readonly CommandCall[]): string[] => {
  return calls
    .filter((call) => call.command === 'git')
    .map((call) => call.args.join(' '));
};
