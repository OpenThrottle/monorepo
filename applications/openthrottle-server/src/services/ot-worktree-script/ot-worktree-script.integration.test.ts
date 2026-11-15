/**
 * @description The real ot-worktree `destroy.sh` and github-cleanup `classify-branches.sh`, run
 * against a temp FOREIGN repo, pinning the guards that keep a live plan-run worktree on disk.
 *
 * The incident they encode: a worktree created moments earlier from `origin/main` — clean, no
 * commits, no PR — looks exactly like merged work, and was removed mid-run while its plan run was
 * IN_PROGRESS. The server's SKIPPED_ACTIVE_RUN guard existed, but destroy.sh only asked it AFTER
 * `git worktree remove`, so it saved the checkout record and never the files.
 *
 * A stub GraphQL server stands in for OpenThrottle and answers deregisterWorktreeCheckout with a
 * configurable outcome, so the scripts' endpoint ladder is exercised over real HTTP. HOME points at
 * the scratch dir, so a developer's own `~/.openthrottle/.env` is never read.
 *
 * destroy.sh also appends one JSON line per invocation to `$HOME/.openthrottle/logs/
 * worktree-removals.log`; with HOME in the scratch dir, each test reads back exactly its own lines.
 *
 * Scripts are spawned with the async `execFile`: the stub server lives in this process, and a
 * synchronous spawn would block the event loop it answers on.
 */

import { execFile, execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const REPO_ROOT = join(import.meta.dirname, '../../../../..');
const DESTROY_SCRIPT = join(REPO_ROOT, 'skills/ot-worktree/scripts/destroy.sh');
const CLASSIFY_SCRIPT = join(
  REPO_ROOT,
  'skills/github-cleanup/scripts/classify-branches.sh',
);

const WORKTREE_NAME = 'live-plan-run';
const WORKTREE_BRANCH = `openthrottle/${WORKTREE_NAME}`;

interface ScriptResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

interface RemovalLogLine {
  readonly agent_session: string;
  readonly ancestry: string;
  readonly branch: string;
  readonly dry_run: boolean;
  readonly force: boolean;
  readonly parent: string;
  readonly path: string;
  readonly pid: number;
  readonly ppid: number;
  readonly probe: string;
  readonly result: string;
  readonly ts: string;
}

interface StubServer {
  readonly close: () => Promise<void>;
  readonly requests: string[];
  readonly url: string;
}

const startStubServer = async (outcome: string): Promise<StubServer> => {
  const requests: string[] = [];
  const server: Server = createServer(
    (request: IncomingMessage, response: ServerResponse) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      request.on('end', () => {
        requests.push(Buffer.concat(chunks).toString('utf8'));
        response.setHeader('Content-Type', 'application/json');
        response.end(
          JSON.stringify({
            data: { deregisterWorktreeCheckout: { outcome } },
          }),
        );
      });
    },
  );
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const port =
    typeof address === 'object' && address !== null ? address.port : 0;

  return {
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    },
    requests,
    url: `http://127.0.0.1:${port}/graphql`,
  };
};

const runScript = async (
  script: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv },
): Promise<ScriptResult> => {
  return new Promise((resolve) => {
    execFile(
      'bash',
      [script, ...args],
      { cwd: options.cwd, env: options.env },
      (error, stdout, stderr) => {
        const code = error === null ? 0 : error.code;
        resolve({
          exitCode: typeof code === 'number' ? code : 1,
          stderr,
          stdout,
        });
      },
    );
  });
};

describe('guards against removing a live plan-run worktree', () => {
  let scratch: string;
  let checkout: string;
  let worktreePath: string;
  let stubBin: string;
  let stub: StubServer | undefined;

  const git = (cwd: string, ...args: string[]): string => {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  };

  const isRegistered = (): boolean => {
    return git(checkout, 'worktree', 'list', '--porcelain').includes(
      `worktree ${worktreePath}`,
    );
  };

  const removalLog = (): unknown[] => {
    const file = join(scratch, '.openthrottle/logs/worktree-removals.log');
    if (!existsSync(file)) {
      return [];
    }
    return readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => {
        return line.length > 0;
      })
      .map((line): unknown => {
        return JSON.parse(line);
      });
  };

  /** Only what the scripts need: no developer token, endpoint or home-dir .env leaks in. */
  const scriptEnv = (extra: NodeJS.ProcessEnv): NodeJS.ProcessEnv => {
    return {
      CLAUDE_CODE_SESSION_ID: 'session-under-test',
      GIT_CONFIG_NOSYSTEM: '1',
      HOME: scratch,
      OPENTHROTTLE_WORKTREE_ROOT: join(scratch, 'worktrees'),
      PATH: `${stubBin}:${process.env.PATH ?? ''}`,
      TMPDIR: scratch,
      ...extra,
    };
  };

  const serverEnv = (server: StubServer): NodeJS.ProcessEnv => {
    return scriptEnv({
      OPENTHROTTLE_GRAPHQL_URL: server.url,
      OPENTHROTTLE_MCP_AUTH_TOKEN: 'test-token',
    });
  };

  beforeEach(() => {
    scratch = realpathSync(mkdtempSync(join(tmpdir(), 'ot-live-worktree-')));
    const origin = join(scratch, 'acme', 'widgets.git');
    checkout = join(scratch, 'widgets');
    worktreePath = join(scratch, 'worktrees', WORKTREE_NAME);
    stubBin = join(scratch, 'bin');

    mkdirSync(origin, { recursive: true });
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin]);
    execFileSync('git', ['clone', '-q', origin, checkout], { stdio: 'ignore' });
    git(checkout, 'config', 'user.email', 'test@example.com');
    git(checkout, 'config', 'user.name', 'Test');
    git(checkout, 'config', 'commit.gpgsign', 'false');
    writeFileSync(join(checkout, 'README.md'), '# widgets\n');
    git(checkout, 'add', 'README.md');
    git(checkout, 'commit', '-q', '--no-verify', '-m', 'init');
    git(checkout, 'push', '-q', 'origin', 'main');
    git(checkout, 'remote', 'set-head', 'origin', 'main');

    // Exactly the incident's shape: a fresh branch off origin/main, nothing committed.
    mkdirSync(join(scratch, 'worktrees'));
    git(
      checkout,
      'worktree',
      'add',
      '-q',
      '--no-track',
      '-b',
      WORKTREE_BRANCH,
      worktreePath,
      'origin/main',
    );

    // classify-branches.sh asks gh for PR state; this repo has no PRs.
    mkdirSync(stubBin);
    writeFileSync(join(stubBin, 'gh'), '#!/bin/sh\nprintf "[]\\n"\n');
    chmodSync(join(stubBin, 'gh'), 0o755);
  });

  afterEach(async () => {
    await stub?.close();
    stub = undefined;
    rmSync(scratch, { force: true, recursive: true });
  });

  describe('destroy.sh', () => {
    it('refuses, even with --force, when OpenThrottle reports an unsettled plan run', async () => {
      stub = await startStubServer('SKIPPED_ACTIVE_RUN');

      const plain = await runScript(DESTROY_SCRIPT, [worktreePath], {
        cwd: checkout,
        env: serverEnv(stub),
      });
      const forced = await runScript(
        DESTROY_SCRIPT,
        [worktreePath, '--force'],
        {
          cwd: checkout,
          env: serverEnv(stub),
        },
      );

      expect(plain.exitCode).toBe(1);
      expect(plain.stderr).toContain('refusing to remove it');
      expect(forced.exitCode).toBe(1);
      expect(existsSync(join(worktreePath, 'README.md'))).toBe(true);
      expect(isRegistered()).toBe(true);
      expect(stub.requests[0]).toContain(worktreePath);
      expect(removalLog()).toEqual([
        expect.objectContaining({
          branch: WORKTREE_BRANCH,
          force: false,
          path: worktreePath,
          probe: 'SKIPPED_ACTIVE_RUN',
          result: 'refused-active-run',
        }),
        expect.objectContaining({
          force: true,
          result: 'refused-active-run',
        }),
      ]);
    }, 60_000);

    it('reports the refusal on --dry-run too', async () => {
      stub = await startStubServer('SKIPPED_ACTIVE_RUN');

      const result = await runScript(
        DESTROY_SCRIPT,
        [worktreePath, '--dry-run'],
        {
          cwd: checkout,
          env: serverEnv(stub),
        },
      );

      expect(result.exitCode).toBe(1);
      expect(isRegistered()).toBe(true);
    }, 60_000);

    it('removes the worktree when the server says it is live but not in use', async () => {
      stub = await startStubServer('SKIPPED_LIVE');

      const result = await runScript(DESTROY_SCRIPT, [worktreePath], {
        cwd: checkout,
        env: serverEnv(stub),
      });

      expect(result.exitCode).toBe(0);
      expect(existsSync(worktreePath)).toBe(false);
      expect(isRegistered()).toBe(false);
      // The pre-removal probe, then the post-removal deregistration.
      expect(stub.requests).toHaveLength(2);
      const [line, ...rest] = removalLog();
      expect(rest).toHaveLength(0);
      expect(line).toEqual(
        expect.objectContaining<Partial<RemovalLogLine>>({
          agent_session: 'session-under-test',
          branch: WORKTREE_BRANCH,
          dry_run: false,
          path: worktreePath,
          probe: 'SKIPPED_LIVE',
          result: 'removed',
        }),
      );
      // Attribution: who called it, and the chain above that.
      expect(line).toEqual(
        expect.objectContaining({
          ancestry: expect.any(String),
          parent: expect.any(String),
          pid: expect.any(Number),
          ppid: expect.any(Number),
          ts: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
        }),
      );
      // The probe carries no audit; the deregistration carries the log's attribution fields.
      const [probe, deregistration] = stub.requests.map((body): unknown =>
        JSON.parse(body),
      );
      expect(probe).toEqual(
        expect.objectContaining({
          variables: { input: { filesystemPath: worktreePath } },
        }),
      );
      expect(deregistration).toEqual(
        expect.objectContaining({
          variables: {
            input: {
              audit: {
                agentSession: 'session-under-test',
                ancestry: expect.any(String),
                branch: WORKTREE_BRANCH,
                parent: expect.any(String),
                pid: expect.any(Number),
                ppid: expect.any(Number),
                probe: 'SKIPPED_LIVE',
                result: 'removed',
                ts: expect.stringMatching(
                  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/,
                ),
              },
              filesystemPath: worktreePath,
            },
          },
        }),
      );
    }, 60_000);

    it('logs a dirty refusal and a dry run', async () => {
      writeFileSync(join(worktreePath, 'scratch.txt'), 'uncommitted\n');
      const env = scriptEnv({ OPENTHROTTLE_WORKTREE_ACTIVE_RUN_GUARD: '0' });

      const refused = await runScript(DESTROY_SCRIPT, [worktreePath], {
        cwd: checkout,
        env,
      });
      const dryRun = await runScript(
        DESTROY_SCRIPT,
        [worktreePath, '--dry-run'],
        { cwd: checkout, env },
      );

      expect(refused.exitCode).toBe(1);
      expect(dryRun.exitCode).toBe(0);
      expect(isRegistered()).toBe(true);
      expect(removalLog()).toEqual([
        expect.objectContaining({ probe: 'not-run', result: 'refused-dirty' }),
        expect.objectContaining({
          dry_run: true,
          probe: 'disabled',
          result: 'dry-run',
        }),
      ]);
    }, 60_000);

    it('logs a target that is not a registered worktree', async () => {
      const result = await runScript(
        DESTROY_SCRIPT,
        [join(scratch, 'nowhere')],
        { cwd: checkout, env: scriptEnv({}) },
      );

      expect(result.exitCode).toBe(1);
      expect(removalLog()).toEqual([
        expect.objectContaining({ result: 'refused-not-registered' }),
      ]);
    }, 60_000);

    it('never fails a removal when the log cannot be written', async () => {
      // A regular file where the log directory should be: mkdir -p fails.
      writeFileSync(join(scratch, 'blocker'), '');

      const result = await runScript(DESTROY_SCRIPT, [worktreePath], {
        cwd: checkout,
        env: scriptEnv({
          OPENTHROTTLE_WORKTREE_ACTIVE_RUN_GUARD: '0',
          OPENTHROTTLE_WORKTREE_DEREGISTER: '0',
          OPENTHROTTLE_WORKTREE_REMOVAL_LOG: join(scratch, 'blocker/x.log'),
        }),
      });

      expect(result.exitCode).toBe(0);
      expect(isRegistered()).toBe(false);
    }, 60_000);

    it('fails open when OpenThrottle cannot be reached', async () => {
      const result = await runScript(DESTROY_SCRIPT, [worktreePath], {
        cwd: checkout,
        env: scriptEnv({
          OPENTHROTTLE_GRAPHQL_URL: 'http://127.0.0.1:9/graphql',
          OPENTHROTTLE_MCP_AUTH_TOKEN: 'test-token',
        }),
      });

      expect(result.exitCode).toBe(0);
      expect(isRegistered()).toBe(false);
      expect(removalLog()).toEqual([
        expect.objectContaining({ probe: 'unavailable', result: 'removed' }),
      ]);
    }, 60_000);

    it('skips the check when OPENTHROTTLE_WORKTREE_ACTIVE_RUN_GUARD=0', async () => {
      stub = await startStubServer('SKIPPED_ACTIVE_RUN');

      const result = await runScript(DESTROY_SCRIPT, [worktreePath], {
        cwd: checkout,
        env: {
          ...serverEnv(stub),
          OPENTHROTTLE_WORKTREE_ACTIVE_RUN_GUARD: '0',
        },
      });

      expect(result.exitCode).toBe(0);
      expect(isRegistered()).toBe(false);
      // Only the post-removal deregistration was sent.
      expect(stub.requests).toHaveLength(1);
      expect(removalLog()).toEqual([
        expect.objectContaining({ probe: 'disabled', result: 'removed' }),
      ]);
    }, 60_000);
  });

  describe('classify-branches.sh', () => {
    it('keeps a fresh worktree branch with no commits and no PR instead of rating it SAFE', async () => {
      git(checkout, 'branch', 'merged-without-worktree', 'origin/main');

      const result = await runScript(CLASSIFY_SCRIPT, ['--no-fetch'], {
        cwd: checkout,
        env: scriptEnv({}),
      });
      const rows = result.stdout
        .split('\n')
        .map((line) => {
          return line.split('\t');
        })
        .filter((columns) => {
          return columns.length >= 2;
        });
      const verdictOf = (branch: string): string | undefined => {
        return rows.find((columns) => {
          return columns[1] === branch;
        })?.[0];
      };

      expect(result.exitCode).toBe(0);
      expect(verdictOf(WORKTREE_BRANCH)).toBe('KEEP');
      expect(verdictOf('merged-without-worktree')).toBe('SAFE');
    }, 60_000);
  });
});
