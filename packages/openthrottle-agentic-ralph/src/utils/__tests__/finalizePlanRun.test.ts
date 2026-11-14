import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

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
import {
  finalizePlanRun,
  preparePlanRunPrDraftDir,
  resolvePlanRunPrDraftDir,
  shouldMarkPlanRunReady,
} from '../finalizePlanRun.ts';
import {
  classifyPlanRunPrBody,
  PLAN_RUN_BODY_CLOSE_MARKER,
  PLAN_RUN_BODY_OPEN_MARKER,
  wrapPlanRunBody,
} from '../plan-run-pr-body.ts';

const PLAN_ID = '1f4ba44f-8bb8-407c-a0f2-a4bb1f352278';
const BRANCH = 'openthrottle/plan-1f4ba44f';
const HEAD_SHA = 'deadbeef0123456789abcdef0123456789abcdef';
const TASK_DONE_WITH_COMMIT = '11111111-1111-4111-8111-111111111111';
const TASK_DONE_NO_COMMIT = '22222222-2222-4222-8222-222222222222';
const TASK_BLOCKED = '33333333-3333-4333-8333-333333333333';
const TASK_ON_MAIN = '44444444-4444-4444-8444-444444444444';
const TEMPLATE = `# Summary\n\n**TODO:** Describe the changes in this PR.\n\n## Testing\n\n- [ ] Pipelines should be passing\n- [ ] **TODO:** Provide steps to test the changes fully\n`;

/** Twenty commits already on main sit below the branch's single commit. */
const BASE_COMMITS = Array.from(
  { length: 20 },
  (_, index) =>
    `b${String(index).padStart(6, '0')} feat: landed on main #${600 + index}`,
);
const BRANCH_COMMIT = `a1b2c3d fix(openthrottle-agentic-ralph): settle the repo`;

function asExecuteGraphqlV2(
  impl: (document: unknown, variables?: unknown) => Promise<unknown>,
): WorkflowExecuteGraphqlV2;
function asExecuteGraphqlV2(impl: unknown): unknown {
  return impl;
}

const ok = (stdout = ''): WorkflowRalphCommandResult => {
  return {
    exitCode: 0,
    stderr: '',
    stdout,
  };
};

const BUNDLED_TEMPLATE = `# Summary\n\n**TODO:** What changed and why.\n\n## Testing\n\n- [ ] **TODO:** Steps to verify\n\n## Bundled follow-ups\n\n- [ ] Learnings fed back\n`;

/** Where the fixture repo keeps its PR template: its own, only the skill's bundled one, or none. */
type TemplateLocation = 'bundled' | 'none' | 'repo';

const createCwdWithTemplate = async (
  templateAt: TemplateLocation = 'repo',
): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'ralph-finalize-'));
  const guardDir = join(
    cwd,
    '.agents',
    'skills',
    'github-pull-request',
    'scripts',
  );
  await mkdir(guardDir, { recursive: true });
  if (templateAt === 'repo') {
    await mkdir(join(cwd, '.github'), { recursive: true });
    await writeFile(
      join(cwd, '.github', 'pull_request_template.md'),
      TEMPLATE,
      'utf8',
    );
  }
  if (templateAt === 'bundled') {
    const templatesDir = join(
      cwd,
      '.agents',
      'skills',
      'github-pull-request',
      'templates',
    );
    await mkdir(templatesDir, { recursive: true });
    await writeFile(
      join(templatesDir, 'pull_request_template.md'),
      BUNDLED_TEMPLATE,
      'utf8',
    );
  }
  await writeFile(
    join(guardDir, 'check-attribution.sh'),
    '#!/bin/sh\nexit 0\n',
    'utf8',
  );

  return cwd;
};

const createExecuteGraphqlV2 = (appendCalls: unknown[]) => {
  return asExecuteGraphqlV2(async (document, variables) => {
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
            summary: `Run settle against a fresh worktree and confirm the repo id.`,
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
};

interface StubOptions {
  readonly aheadCount: string;
  readonly attribution?: WorkflowRalphCommandResult;
  /** @description Collects each body the attribution guard is shown. */
  readonly attributionBodies?: string[];
  /** @description What the guard's `--commits HEAD` check returns before the push. */
  readonly commitAttribution?: WorkflowRalphCommandResult;
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
) => {
  return vi.fn<WorkflowRalphCommandRunner>(async ({ args, command, cwd }) => {
    if (command === 'git') {
      const [sub, first] = args;
      if (sub === 'rev-parse' && first === '--abbrev-ref') {
        return ok(`${BRANCH}\n`);
      }
      if (sub === 'rev-parse' && first === '--show-toplevel') {
        return ok(`${cwd}\n`);
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
    if (command === 'bash' && args[0]?.endsWith('check-attribution.sh')) {
      if (args.includes('--commits')) {
        return options.commitAttribution ?? ok();
      }
      const bodyFile = args[args.indexOf('--body-file') + 1];
      if (options.attributionBodies !== undefined && bodyFile !== undefined) {
        options.attributionBodies.push(await readFile(bodyFile, 'utf8'));
      }
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
};

const execFileAsync = promisify(execFile);

/** A real `git` runner, for the tests that need git's own view of ignored files. */
const realRunCommand: WorkflowRalphCommandRunner = async ({
  args,
  command,
  cwd,
}) => {
  try {
    const { stderr, stdout } = await execFileAsync(command, [...args], { cwd });

    return { exitCode: 0, stderr, stdout };
  } catch (error: unknown) {
    return {
      exitCode: 1,
      stderr: error instanceof Error ? error.message : String(error),
      stdout: '',
    };
  }
};

/** A fresh repo with one commit and no `.gitignore` of its own. */
const createGitRepo = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'ralph-draft-dir-'));
  await execFileAsync('git', ['init', '--quiet'], { cwd });
  await writeFile(join(cwd, 'README.md'), '# repo\n', 'utf8');
  await execFileAsync('git', ['add', 'README.md'], { cwd });
  await execFileAsync(
    'git',
    [
      '-c',
      'user.email=test@example.com',
      '-c',
      'user.name=test',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '--no-verify',
      '-m',
      'chore: init',
    ],
    { cwd },
  );

  return cwd;
};

describe('resolvePlanRunPrDraftDir', () => {
  it('resolves <worktree root>/.ot-pr-draft, outside .git', async () => {
    const cwd = await createGitRepo();
    const draftDir = await resolvePlanRunPrDraftDir({
      cwd,
      runCommand: realRunCommand,
    });
    const { stdout: topLevel } = await execFileAsync(
      'git',
      ['rev-parse', '--show-toplevel'],
      { cwd },
    );

    expect(draftDir).toBe(join(topLevel.trim(), '.ot-pr-draft'));
    expect(draftDir).not.toContain(`${'/'}.git${'/'}`);
  });

  it('resolves the worktree root even when cwd is a subdirectory', async () => {
    const cwd = await createGitRepo();
    await mkdir(join(cwd, 'packages', 'app'), { recursive: true });

    expect(
      await resolvePlanRunPrDraftDir({
        cwd: join(cwd, 'packages', 'app'),
        runCommand: realRunCommand,
      }),
    ).toBe(await resolvePlanRunPrDraftDir({ cwd, runCommand: realRunCommand }));
  });

  it('is undefined outside a git checkout', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'ralph-no-git-'));

    expect(
      await resolvePlanRunPrDraftDir({ cwd, runCommand: realRunCommand }),
    ).toBeUndefined();
  });
});

describe('preparePlanRunPrDraftDir', () => {
  it('creates the dir with a .gitignore of `*`', async () => {
    const cwd = await createGitRepo();
    const draftDir = await preparePlanRunPrDraftDir({
      cwd,
      runCommand: realRunCommand,
    });

    expect(draftDir).toBeDefined();
    expect(await readFile(join(draftDir ?? '', '.gitignore'), 'utf8')).toBe(
      '*\n',
    );
  });

  it('keeps `git status --porcelain` clean after a draft is written, with no repo ignore rule', async () => {
    const cwd = await createGitRepo();
    const draftDir =
      (await preparePlanRunPrDraftDir({ cwd, runCommand: realRunCommand })) ??
      '';
    await writeFile(join(draftDir, 'title.txt'), 'fix: a title\n', 'utf8');
    await writeFile(join(draftDir, 'body.md'), '# Summary\n', 'utf8');
    await execFileAsync('git', ['add', '-A'], { cwd });
    const { stdout } = await execFileAsync('git', ['status', '--porcelain'], {
      cwd,
    });

    expect(stdout).toBe('');
  });

  it('removes a stale draft but keeps the .gitignore', async () => {
    const cwd = await createGitRepo();
    const draftDir =
      (await preparePlanRunPrDraftDir({ cwd, runCommand: realRunCommand })) ??
      '';
    await writeFile(join(draftDir, 'title.txt'), 'fix: stale\n', 'utf8');
    await writeFile(join(draftDir, 'body.md'), '# Stale\n', 'utf8');

    await preparePlanRunPrDraftDir({ cwd, runCommand: realRunCommand });

    expect(await readdir(draftDir)).toEqual(['.gitignore']);
  });
});

describe('finalizePlanRun', () => {
  it('skips push and PR when the branch has no commits ahead of the base', async () => {
    const cwd = await createCwdWithTemplate();
    const appendCalls: unknown[] = [];
    const runCommand = createRunCommand({ aheadCount: '0' });

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      draftDir: undefined,
      executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
      markReady: shouldMarkPlanRunReady('workflow_complete'),
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

  it.each([
    'workflow_budget_exhausted',
    'workflow_max_iterations',
    'workflow_tasks_blocked',
  ] as const)(
    'skips push and PR for %s when the branch has no commits ahead',
    async (priorReason) => {
      const cwd = await createCwdWithTemplate();
      const runCommand = createRunCommand({ aheadCount: '0' });

      const result = await finalizePlanRun({
        baseBranch: 'main',
        cwd,
        draftDir: undefined,
        executeGraphqlV2: createExecuteGraphqlV2([]),
        markReady: shouldMarkPlanRunReady(priorReason),
        onChunk: undefined,
        planId: PLAN_ID,
        priorReason,
        runCommand,
      });

      expect(result).toEqual({
        exitCode: 0,
        reason: priorReason,
        status: 'finished',
      });
      expect(runCommand).not.toHaveBeenCalledWith(
        expect.objectContaining({ args: expect.arrayContaining(['push']) }),
      );
      expect(runCommand).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: 'gh' }),
      );
    },
  );

  it('compares against a freshly fetched origin/<base>, not the local base', async () => {
    const cwd = await createCwdWithTemplate();
    const runCommand = createRunCommand({ aheadCount: '0' });

    await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      draftDir: undefined,
      executeGraphqlV2: createExecuteGraphqlV2([]),
      markReady: shouldMarkPlanRunReady('workflow_complete'),
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
      draftDir: undefined,
      executeGraphqlV2: createExecuteGraphqlV2([]),
      markReady: shouldMarkPlanRunReady('workflow_complete'),
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
    const run = async (templateAt: TemplateLocation = 'repo') => {
      const cwd = await createCwdWithTemplate(templateAt);
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
        draftDir: undefined,
        executeGraphqlV2: createExecuteGraphqlV2([]),
        markReady: shouldMarkPlanRunReady('workflow_tasks_exhausted'),
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

    it('leaves the PR of a blocked plan in draft (never `gh pr ready`)', async () => {
      const cwd = await createCwdWithTemplate();
      const runCommand = createRunCommand({ aheadCount: '1' }, (args) => {
        if (args[1] === 'create') {
          return ok('https://github.com/OpenThrottle/monorepo/pull/42\n');
        }
        if (args[1] === 'view') {
          return ok('42\n');
        }
        if (args[1] === 'ready') {
          throw new Error('a blocked plan must not mark its PR ready');
        }
        return undefined;
      });

      const result = await finalizePlanRun({
        baseBranch: 'main',
        cwd,
        draftDir: undefined,
        executeGraphqlV2: createExecuteGraphqlV2([]),
        markReady: shouldMarkPlanRunReady('workflow_tasks_blocked'),
        onChunk: undefined,
        planId: PLAN_ID,
        priorReason: 'workflow_tasks_blocked',
        runCommand,
      });

      expect(result).toEqual({
        exitCode: 0,
        headSha: HEAD_SHA,
        prNumber: 42,
        reason: 'workflow_tasks_blocked',
        status: 'finished',
      });
      expect(runCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining(['pr', 'create', '--draft']),
        }),
      );
    });

    it.each(['workflow_max_iterations', 'workflow_budget_exhausted'] as const)(
      'pushes a %s run under a draft PR built from the fallback body when the agent wrote no draft',
      async (priorReason) => {
        const cwd = await createCwdWithTemplate();
        const appendCalls: unknown[] = [];
        const runCommand = createRunCommand({ aheadCount: '2' }, (args) => {
          if (args[1] === 'create') {
            return ok('https://github.com/OpenThrottle/monorepo/pull/42\n');
          }
          if (args[1] === 'view') {
            return ok('42\n');
          }
          if (args[1] === 'ready') {
            throw new Error('an unfinished plan must not mark its PR ready');
          }
          return undefined;
        });

        const result = await finalizePlanRun({
          baseBranch: 'main',
          cwd,
          // The agent stopped early, so the draft dir it was handed holds nothing.
          draftDir: join(cwd, '.ot-pr-draft'),
          executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
          markReady: shouldMarkPlanRunReady(priorReason),
          onChunk: undefined,
          planId: PLAN_ID,
          priorReason,
          runCommand,
        });

        const createCall = runCommand.mock.calls.find(
          ([call]) => call.command === 'gh' && call.args[1] === 'create',
        );
        const bodyFile =
          createCall?.[0].args[createCall[0].args.indexOf('--body-file') + 1];
        const body =
          bodyFile === undefined ? '' : await readFile(bodyFile, 'utf8');

        expect(result).toEqual({
          exitCode: 0,
          headSha: HEAD_SHA,
          prNumber: 42,
          reason: priorReason,
          status: 'finished',
        });
        expect(createCall?.[0].args).toContain('--draft');
        expect(body).toContain('- Rotate the token (BLOCKED)');
        expect(JSON.stringify(appendCalls)).toContain('source=fallback');
      },
    );

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

    it("falls back to the github-pull-request skill's bundled template", async () => {
      const { created } = await run('bundled');

      expect(created.body).toContain('**Settle the repo after a plan run**');
      expect(created.body).toContain('## Bundled follow-ups');
      expect(created.body).toContain('- [ ] Check Settle the repo:');
      expect(created.body).not.toContain('TODO');
    });

    it('builds Summary and Testing itself when there is no template at all', async () => {
      const { created } = await run('none');

      expect(created.body).toContain('## Summary');
      expect(created.body).toContain('**Settle the repo after a plan run**');
      expect(created.body).toContain('## Testing');
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

  describe('when the agent wrote a draft', () => {
    const runWithDraft = async (draft: {
      readonly body: string;
      readonly title: string;
    }) => {
      const cwd = await createCwdWithTemplate();
      const draftDir = join(cwd, '.ot-pr-draft');
      await mkdir(draftDir, { recursive: true });
      await writeFile(join(draftDir, 'title.txt'), draft.title, 'utf8');
      await writeFile(join(draftDir, 'body.md'), draft.body, 'utf8');
      const appendCalls: unknown[] = [];
      const runCommand = createRunCommand({ aheadCount: '1' }, (args) => {
        if (args[1] === 'create') {
          return ok('https://github.com/OpenThrottle/monorepo/pull/42\n');
        }
        if (args[1] === 'view') {
          return ok('42\n');
        }
        if (args[1] === 'ready') {
          return ok();
        }
        return undefined;
      });

      await finalizePlanRun({
        baseBranch: 'main',
        cwd,
        draftDir,
        executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
        markReady: shouldMarkPlanRunReady('workflow_complete'),
        onChunk: undefined,
        planId: PLAN_ID,
        priorReason: 'workflow_complete',
        runCommand,
      });

      const createArgs =
        runCommand.mock.calls.find(
          ([call]) => call.command === 'gh' && call.args[1] === 'create',
        )?.[0].args ?? [];
      const bodyFile = createArgs[createArgs.indexOf('--body-file') + 1];

      return {
        appendCalls: JSON.stringify(appendCalls),
        body: bodyFile === undefined ? '' : await readFile(bodyFile, 'utf8'),
        title: createArgs[createArgs.indexOf('--title') + 1] ?? '',
      };
    };

    it('publishes a valid draft with the OT footer swapped in and host markers around it', async () => {
      const published = await runWithDraft({
        body: `# Summary\n\nThe settle step now records the repo id.\n\n## Testing\n\n- [ ] Run a plan and check the repo id\n\nPlan-Id: ${PLAN_ID}\nTask-Id: 99999999-9999-4999-8999-999999999999\n`,
        title: `fix(openthrottle-agentic-ralph): record the repo id on settle\n`,
      });

      expect(published.title).toBe(
        'fix(openthrottle-agentic-ralph): record the repo id on settle',
      );
      expect(published.body).toContain(
        'The settle step now records the repo id.',
      );
      expect(published.body).not.toContain(
        '99999999-9999-4999-8999-999999999999',
      );
      expect(published.body).toContain(`Task-Id: ${TASK_DONE_WITH_COMMIT}`);
      expect(published.body).toContain(`Task-Id: ${TASK_DONE_NO_COMMIT}`);
      expect(published.body.startsWith(`${PLAN_RUN_BODY_OPEN_MARKER}\n`)).toBe(
        true,
      );
      expect(classifyPlanRunPrBody(published.body)).toBe('host');
      expect(published.appendCalls).toContain('source=agent-draft');
    });

    it('falls back to the host body when the draft title is not conventional', async () => {
      const published = await runWithDraft({
        body: '# Summary\n\nA real summary.\n',
        title: 'Record the repo id',
      });

      expect(published.title).toBe(
        'fix(openthrottle-agentic-ralph): settle the repo',
      );
      expect(published.body).toContain('**Settle the repo after a plan run**');
      expect(published.appendCalls).toContain('source=fallback');
      expect(published.appendCalls).toContain('conventional-commit');
    });

    it('falls back to the host body when the draft still has template TODO text', async () => {
      const published = await runWithDraft({
        body: '# Summary\n\n**TODO:** Describe the changes in this PR.\n',
        title: 'fix: record the repo id',
      });

      expect(published.body).not.toContain('TODO');
      expect(published.appendCalls).toContain('template TODO');
    });
  });

  describe('when a PR already exists', () => {
    const runExisting = async (currentBody: string) => {
      const cwd = await createCwdWithTemplate();
      const appendCalls: unknown[] = [];
      const attributionBodies: string[] = [];
      const runCommand = createRunCommand(
        {
          aheadCount: '1',
          attributionBodies,
          existingPrs: '[{"number":99}]\n',
        },
        (args) => {
          if (args[1] === 'view') {
            expect(args).toEqual([
              'pr',
              'view',
              '99',
              '--json',
              'body',
              '--jq',
              '.body',
            ]);
            return ok(`${currentBody}\n`);
          }
          if (args[1] === 'edit' || args[1] === 'ready') {
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
        draftDir: undefined,
        executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
        markReady: shouldMarkPlanRunReady('workflow_complete'),
        onChunk: undefined,
        planId: PLAN_ID,
        priorReason: 'workflow_complete',
        runCommand,
      });
      const editArgs = runCommand.mock.calls.find(
        ([call]) => call.command === 'gh' && call.args[1] === 'edit',
      )?.[0].args;
      const editedBodyFile = editArgs?.[editArgs.indexOf('--body-file') + 1];
      let editedBody: string | undefined;
      if (editedBodyFile !== undefined) {
        editedBody = await readFile(editedBodyFile, 'utf8');
      }

      return {
        appendCalls: JSON.stringify(appendCalls),
        attributionBodies,
        editArgs,
        editedBody,
        result,
        runCommand,
      };
    };

    const olderHostBody = wrapPlanRunBody(
      '# Summary\n\nAn older host body.\n\nPlan-Id: x',
    );

    it('refreshes an untouched host-written body, then marks the PR ready', async () => {
      const { editArgs, result, runCommand } = await runExisting(
        wrapPlanRunBody('# Summary\n\nAn older host body.\n\nPlan-Id: x'),
      );

      expect(editArgs?.slice(0, 4)).toEqual(['pr', 'edit', '99', '--title']);
      const bodyFile = editArgs?.[editArgs.indexOf('--body-file') + 1] ?? '';
      expect(await readFile(bodyFile, 'utf8')).toContain(
        `Task-Id: ${TASK_DONE_NO_COMMIT}`,
      );
      expect(runCommand).toHaveBeenCalledWith(
        expect.objectContaining({ args: ['pr', 'ready', '99'] }),
      );
      expect(result).toEqual({
        exitCode: 0,
        headSha: HEAD_SHA,
        prNumber: 99,
        reason: 'workflow_complete',
        status: 'finished',
      });
    });

    it('refreshes an empty body', async () => {
      const { editArgs } = await runExisting('');

      expect(editArgs).toBeDefined();
    });

    it('leaves a human-edited body alone and still marks the PR ready', async () => {
      const hostBody = wrapPlanRunBody('# Summary\n\nAn older host body.');
      const { appendCalls, editArgs, result, runCommand } = await runExisting(
        hostBody.replace('An older host body.', 'A reviewer rewrote this.'),
      );

      expect(editArgs).toBeUndefined();
      expect(appendCalls).toContain('was edited inside the host markers');
      expect(runCommand).toHaveBeenCalledWith(
        expect.objectContaining({ args: ['pr', 'ready', '99'] }),
      );
      expect(result).toMatchObject({
        prNumber: 99,
        reason: 'workflow_complete',
      });
    });

    it('refreshes a host body followed by a bot footer and keeps the footer', async () => {
      const footer = `\n<!-- codesmith:footer -->\n🤖 Made with a CI bot.\n<!-- /codesmith:footer -->`;
      const { attributionBodies, editedBody } = await runExisting(
        `${olderHostBody}${footer}`,
      );

      expect(editedBody).toContain(`Task-Id: ${TASK_DONE_NO_COMMIT}`);
      expect(editedBody).not.toContain('An older host body.');
      expect(
        editedBody?.endsWith(`${PLAN_RUN_BODY_CLOSE_MARKER}\n${footer}`),
      ).toBe(true);
      expect(attributionBodies.join('')).not.toContain('codesmith');
    });

    it('refreshes a host body under an unknown bot block, so no vendor list is involved', async () => {
      const botBlock = `<!-- some-future-bot:report -->\nAll checks green.\n<!-- /some-future-bot:report -->\n\n`;
      const { editedBody } = await runExisting(`${botBlock}${olderHostBody}`);

      expect(
        editedBody?.startsWith(`${botBlock}${PLAN_RUN_BODY_OPEN_MARKER}\n`),
      ).toBe(true);
      expect(editedBody).toContain(`Task-Id: ${TASK_DONE_NO_COMMIT}`);
    });

    it('keeps human prose above and below the markers on refresh', async () => {
      const { editedBody } = await runExisting(
        `Context from a reviewer.\n\n${olderHostBody}\nA human note below.`,
      );

      expect(editedBody?.startsWith('Context from a reviewer.\n\n')).toBe(true);
      expect(
        editedBody?.endsWith(
          `${PLAN_RUN_BODY_CLOSE_MARKER}\n\nA human note below.`,
        ),
      ).toBe(true);
      expect(editedBody).not.toContain('An older host body.');
    });

    it('leaves a body with two marked blocks alone', async () => {
      const { editArgs } = await runExisting(
        `${olderHostBody}\n${olderHostBody}`,
      );

      expect(editArgs).toBeUndefined();
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
      draftDir: undefined,
      executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
      markReady: shouldMarkPlanRunReady('workflow_complete'),
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

  it('never pushes when a commit carries attribution, and records the owed step', async () => {
    const cwd = await createCwdWithTemplate();
    const appendCalls: unknown[] = [];
    const runCommand = createRunCommand({
      aheadCount: '1',
      commitAttribution: {
        exitCode: 1,
        stderr: '',
        stdout: '❌ commit abc1234  feat: x\n',
      },
    });

    const result = await finalizePlanRun({
      baseBranch: 'main',
      cwd,
      draftDir: undefined,
      executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
      markReady: shouldMarkPlanRunReady('workflow_complete'),
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
    expect(JSON.stringify(appendCalls)).toContain('commit-attribution');
    expect(runCommand).not.toHaveBeenCalledWith(
      expect.objectContaining({ args: expect.arrayContaining(['push']) }),
    );
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
      draftDir: undefined,
      executeGraphqlV2: createExecuteGraphqlV2(appendCalls),
      markReady: shouldMarkPlanRunReady('workflow_complete'),
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
