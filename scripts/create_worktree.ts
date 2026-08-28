/**
 * @description The ONE way to create + provision an OpenThrottle git worktree,
 * tool-agnostic. Invoked through the thin scripts/create_worktree.sh shim
 * (whose path is baked into the Claude Code WorktreeCreate hook and Cursor's
 * .cursor/worktrees.json, and which resolves tsx before node_modules exists).
 *
 * Invocation modes (auto-detected):
 *   1. CLI / `pnpm worktree:new <name>` — name passed as argv. Creates the
 *      worktree and provisions it. No stdin is read.
 *   2. Claude Code WorktreeCreate hook — hook payload (JSON) arrives on stdin.
 *      The name is parsed from the payload; the worktree is created + provisioned.
 *   3. Provision-in-place — no name arg and no stdin payload, run from INSIDE
 *      an already-created linked worktree (e.g. Cursor, which creates the
 *      worktree itself and then runs a setup command with cwd=$WORKTREE_PATH).
 *      The current worktree is provisioned; no new worktree is created.
 *
 * Hook contract (https://code.claude.com/docs/en/hooks.md):
 *   - MUST print ONLY the worktree's absolute path on stdout.
 *   - Any non-zero exit, or missing path, fails worktree creation.
 * Everything except the final path goes to stderr so stdout stays clean.
 *
 * Dependency budget: node builtins + scripts/lib only. In mode 3 the worktree
 * has no node_modules yet, so nothing here may require an installed package
 * (the shared logger degrades gracefully when chalk is unresolvable).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readEnvValue } from './lib/env.ts';
import { run } from './lib/exec.ts';
import { gitOutput, isLinkedWorktree } from './lib/git.ts';
import { createLogger } from './lib/logger.ts';
import { resolveWorktreePorts } from './lib/worktree-ports.ts';

const logger = createLogger({ stream: process.stderr });

/** Cast-free narrowing for the untrusted hook payload. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Strip any ref prefix and unsafe path characters from a candidate name. */
export const sanitizeWorktreeName = (raw: string): string =>
  raw
    .replace(/^refs\/heads\//, '')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

/**
 * The worktree name from a WorktreeCreate hook payload, trying the likely
 * candidate fields in order. Undefined when none is present.
 */
export const payloadName = (payload: unknown): string | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }

  for (const field of [
    'name',
    'worktree_name',
    'worktreeName',
    'worktree',
    'branch',
    'slug',
  ]) {
    // prettier-ignore
    const value = payload[field];

    if (typeof value === 'string' && value !== '') {
      return value;
    }
  }

  return undefined;
};

/** The session-derived fallback name (`wt-<sid8>`), or `wt-<pid>` without one. */
export const fallbackName = (payload: unknown, pid: number): string => {
  const sessionId =
    isRecord(payload) && typeof payload.session_id === 'string'
      ? payload.session_id
      : '';

  return sessionId === '' ? `wt-${pid}` : `wt-${sessionId.slice(0, 8)}`;
};

export interface WorktreeRootResolution {
  root: string;
  source: string;
}

/**
 * Resolve the root directory every worktree is created under. Precedence:
 *   1. OT_WORKTREE_ROOT in the environment — one-off overrides, and how the
 *      BullMQ provisioner forwards the configured setting.
 *   2. OT_WORKTREE_ROOT in the primary checkout's .env — the workspace-level
 *      setting (/settings/workspace) lands here, so the CLI, the Claude
 *      WorktreeCreate hook, and the worker never disagree.
 *   3. The historical default: a sibling openthrottle-worktrees directory,
 *      deliberately OUTSIDE the repo so worktrees stay clear of the Nx
 *      workspace (daemon watches, Vitest/knip/gitleaks globs, .gitignore).
 * Throws when the resolved root is not absolute.
 */
export const resolveWorktreeRoot = (
  repoRoot: string,
  env: Record<string, string | undefined> = process.env,
  home: string = homedir(),
): WorktreeRootResolution => {
  let root = env.OT_WORKTREE_ROOT ?? '';
  let source = 'OT_WORKTREE_ROOT env';

  if (root === '') {
    root = readEnvValue(join(repoRoot, '.env'), 'OT_WORKTREE_ROOT').replace(/\r$/, ''); // prettier-ignore
    source = `${repoRoot}/.env`;
  }

  if (root === '') {
    root = join(dirname(repoRoot), 'openthrottle-worktrees');
    source = 'default (sibling of the repo)';
  }

  if (root === '~') {
    root = home;
  } else if (root.startsWith('~/')) {
    root = join(home, root.slice(2));
  }

  if (!root.startsWith('/')) {
    throw new Error(
      `worktree root must be an absolute path (got '${root}' from ${source})`,
    );
  }

  return { root: root.replace(/\/+$/, ''), source };
};

/**
 * Provision the worktree by running the worktree's OWN setup_worktree.sh shim
 * inside it (the checkout may be a different commit than this script). stdin
 * is closed so any prompt takes its default; child stdout is routed to OUR
 * stderr so the hook contract holds. OT_SOURCE_REPO points setup at the
 * primary checkout so real service-account tokens are copied into the
 * worktree's reset-to-default .env files.
 */
const provision = (
  worktree: string,
  sourceRepo: string,
  portEnv: Record<string, string>,
): void => {
  if (process.env.CLAUDE_WORKTREE_SETUP === '0') {
    logger.step('CLAUDE_WORKTREE_SETUP=0 — skipping setup_worktree.sh');

    return;
  }

  const outcome = spawnSync('./scripts/setup_worktree.sh', [], {
    cwd: worktree,
    env: { ...process.env, ...portEnv, OT_SOURCE_REPO: sourceRepo },
    // stdout → our stderr (fd 2): stdout must carry only the worktree path.
    stdio: ['ignore', 2, 2],
  });

  if (outcome.error) {
    throw new Error(`setup_worktree.sh failed to start: ${outcome.error.message}`); // prettier-ignore
  }

  if (outcome.status !== 0) {
    throw new Error(`setup_worktree.sh exited with code ${outcome.status ?? 1}`); // prettier-ignore
  }
};

const main = (): void => {
  let name = process.argv[2] ?? '';
  let raw = '';

  // Only read stdin when there's no name arg AND stdin is a pipe (a payload).
  // A TTY (interactive shell) or a name arg means there is no payload to read.
  if (name === '' && !process.stdin.isTTY) {
    try {
      raw = readFileSync(0, 'utf8');
    } catch {
      raw = '';
    }
  }

  // Mode 3: no name, no payload → provision the current worktree in place.
  if (name === '' && raw.trim() === '') {
    if (isLinkedWorktree()) {
      const worktree = gitOutput(['rev-parse', '--show-toplevel']) ?? process.cwd(); // prettier-ignore
      const commonDir = gitOutput(['rev-parse', '--path-format=absolute', '--git-common-dir']) ?? ''; // prettier-ignore
      const sourceRepo = dirname(commonDir);

      logger.info('🌳 Provisioning existing worktree in place');
      logger.detail(`path:   ${worktree}`);
      provision(worktree, sourceRepo, {});
      process.stdout.write(`${worktree}\n`);

      return;
    }

    logger.fail('create_worktree: no worktree name given and not inside a linked worktree.'); // prettier-ignore
    logger.detail('usage: pnpm worktree:new <name>   (or run inside a worktree to provision it)'); // prettier-ignore
    process.exit(1);
  }

  // Modes 1 & 2: create a new worktree.

  let payload: unknown;
  if (raw.trim() !== '') {
    // Record the raw hook payload so the exact field names Claude sends can
    // be verified after the fact.
    const payloadLog = join(tmpdir(), 'claude-worktree-payload.json');
    try {
      writeFileSync(payloadLog, `${raw}\n`);
      logger.info(`🌳 WorktreeCreate payload logged to ${payloadLog}`);
    } catch {
      // Best-effort only.
    }

    try {
      payload = JSON.parse(raw);
    } catch {
      payload = undefined;
    }
  }

  // Resolve the repo root (prefer the payload's cwd, fall back to git).
  const payloadCwd =
    isRecord(payload) && typeof payload.cwd === 'string' ? payload.cwd : '';
  const repoRoot =
    payloadCwd !== '' && existsSync(payloadCwd)
      ? payloadCwd
      : (gitOutput(['rev-parse', '--show-toplevel']) ?? process.cwd());

  if (name === '') {
    const fromPayload = payloadName(payload);

    if (fromPayload === undefined) {
      name = fallbackName(payload, process.pid);
      logger.warn(`No name field in payload; falling back to '${name}'`);
    } else {
      name = fromPayload;
    }
  }

  name = sanitizeWorktreeName(name);
  if (name === '') {
    name = `wt-${process.pid}`;
  }

  let rootResolution: WorktreeRootResolution;
  try {
    rootResolution = resolveWorktreeRoot(repoRoot);
  } catch (error) {
    logger.fail(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const worktree = join(rootResolution.root, name);
  const branch = `openthrottle/${name}`;

  logger.info(`🌳 Creating worktree '${name}'`);
  logger.detail(`repo:   ${repoRoot}`);
  logger.detail(`root:   ${rootResolution.root}  (${rootResolution.source})`);
  logger.detail(`path:   ${worktree}`);
  logger.detail(`branch: ${branch}`);

  mkdirSync(rootResolution.root, { recursive: true });

  // Create the worktree. New branch by default; if the branch already exists,
  // check it out instead of failing.
  const branchExists =
    run('git', ['-C', repoRoot, 'show-ref', '--verify', '--quiet', `refs/heads/${branch}`], { allowFailure: true }).exitCode === 0; // prettier-ignore

  const addArgs = branchExists
    ? ['-C', repoRoot, 'worktree', 'add', worktree, branch]
    : ['-C', repoRoot, 'worktree', 'add', '-b', branch, worktree];

  if (branchExists) {
    logger.detail('(branch exists — checking it out)');
  }

  const added = run('git', addArgs, { allowFailure: true });
  if (added.stderr !== '') {
    logger.detail(added.stderr);
  }
  if (added.exitCode !== 0) {
    logger.fail(`git worktree add failed (exit ${added.exitCode})`);
    process.exit(1);
  }

  // Resolve a deterministic app-port block for this worktree and hand it to
  // setup_worktree via the environment (pinning it in the worktree's
  // .worktree-ports cache, now that the directory exists).
  let portEnv: Record<string, string> = {};
  try {
    const { base, ports } = resolveWorktreePorts(name, { worktreeDir: worktree }); // prettier-ignore
    portEnv = {
      OT_PORT_ADMIN: String(ports.admin),
      OT_PORT_BASE: String(base),
      OT_PORT_CMS: String(ports.cms),
      OT_PORT_DEVELOPER: String(ports.developer),
      OT_PORT_EMAIL: String(ports.email),
      OT_PORT_MCP: String(ports.mcp),
      OT_PORT_SERVER: String(ports.server),
      OT_PORT_WEBSITE: String(ports.website),
    };
    logger.detail(`ports:  app block ${base}-${base + 5} (developer ${ports.developer}, server ${ports.server})`); // prettier-ignore
  } catch {
    logger.warn('port allocation failed; worktree will use the default 6020-6025 block'); // prettier-ignore
  }

  // Run the per-worktree setup INSIDE the new worktree.
  provision(worktree, repoRoot, portEnv);

  // The ONLY thing on stdout: the worktree path.
  process.stdout.write(`${worktree}\n`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
