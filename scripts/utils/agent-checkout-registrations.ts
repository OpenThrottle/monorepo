/**
 * @description The registry of per-checkout agent registrations: state that
 * provisioning writes OUTSIDE a checkout, keyed by the checkout's path, which
 * the directory's removal does not take with it. Each entry pairs the
 * `register` step provisioning runs with the `unregister` step teardown runs,
 * so a registration cannot land without its removal: adding a per-checkout
 * registration for any agent means adding one entry here, both halves at once.
 *
 * Provisioning (`scripts/setup.ts`, `scripts/setup_worktree.ts`) calls
 * {@link registerCheckoutAgents}; worktree teardown (`scripts/teardown_worktree.ts`)
 * calls {@link unregisterCheckoutAgents} before the directory is deleted. A
 * checkout removed any other way (a bare `git worktree remove`, the plan-run
 * reaper, `rm -rf`) is caught by {@link pruneAgentCheckoutOrphans}, behind
 * `pnpm worktree:prune-agents` and run best-effort from `setup.ts`.
 *
 * Deliberately NOT on the registry: codex trust (`./codex-trust.ts`). It is one
 * entry for the PRIMARY checkout that covers every worktree, and teardown must
 * never remove it. Putting it here would make every worktree removal revoke
 * trust for all the others. Leave it off.
 *
 * Everything is fail-open: an entry that is opted out, whose CLI is missing or
 * whose step fails yields an outcome, never a throw, so it can never block a
 * teardown. Each entry keeps its own opt-out env (`<VAR>=0`). Entries go
 * through their agent's own CLI and never hand-edit its registry files, since
 * concurrent sessions write them.
 *
 * Dependency-free (node builtins + sibling utils): provisioning and teardown
 * run under bare Node, before `pnpm install` or after `node_modules` is gone.
 */
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  CLAUDE_MARKETPLACE_MANIFEST,
  CLAUDE_PLUGINS_OPT_OUT_ENV,
  claudeInstalledPluginsPath,
  claudeOnPath,
  describeClaudePluginsResult,
  ensureCheckoutClaudePlugins,
  findOrphanedClaudeCheckouts,
  removeCheckoutClaudePlugins,
} from './claude-plugins.ts';
import { primaryCheckoutDir } from './git.ts';
import type { Logger } from './logger.ts';

/** What every entry is told about where it runs. */
export interface AgentCheckoutContext {
  readonly env: NodeJS.ProcessEnv;
  /** The primary checkout. Never unregistered: it outlives its worktrees. */
  readonly primary: string;
}

/** Whether an entry's own preconditions hold (its CLI exists, the repo ships what it installs). */
export type AgentCheckoutApplies =
  | { readonly applies: false; readonly reason: string }
  | { readonly applies: true };

/** One entry's result for one checkout. */
export type AgentCheckoutOutcome =
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'ok'; readonly message: string }
  | { readonly kind: 'skipped'; readonly reason: string };

/** The checkouts an entry still holds a registration for that no longer exist on disk. */
export type AgentCheckoutOrphans =
  | { readonly checkouts: readonly string[]; readonly kind: 'ok' }
  | { readonly kind: 'failed'; readonly message: string };

/** One agent's per-checkout registration and its removal. */
export interface AgentCheckoutRegistration {
  /** The agent's name, as the parity matrix names it (`claude`, `codex`, …). */
  readonly agent: string;
  /** Is this entry's precondition met? Checked before either step runs. */
  readonly applies: (
    checkout: string,
    context: AgentCheckoutContext,
  ) => AgentCheckoutApplies;
  /**
   * The checkout paths this agent still has registered that no longer exist,
   * read from its own records WITHOUT changing them. Never the primary.
   */
  readonly listOrphans: (context: AgentCheckoutContext) => AgentCheckoutOrphans;
  /** `<optOutEnv>=0` skips every step for this agent. */
  readonly optOutEnv: string;
  /** Provisioning: record `checkout` with the agent. Idempotent. */
  readonly register: (
    checkout: string,
    context: AgentCheckoutContext,
  ) => AgentCheckoutOutcome;
  /** Teardown: remove exactly what `register` recorded for `checkout`. Idempotent. */
  readonly unregister: (
    checkout: string,
    context: AgentCheckoutContext,
  ) => AgentCheckoutOutcome;
}

/** One entry's outcome, labelled with its agent. */
export interface AgentCheckoutResult {
  readonly agent: string;
  readonly outcome: AgentCheckoutOutcome;
}

/** Which half of an entry to run. */
export type AgentCheckoutOperation = 'register' | 'unregister';

/**
 * Claude Code: the repo's own plugins, installed at `--scope local` and so
 * recorded per checkout path in `~/.claude/plugins/installed_plugins.json`.
 */
const claudeRegistration: AgentCheckoutRegistration = {
  agent: 'claude',
  applies: (_checkout, context) => {
    if (!existsSync(join(context.primary, CLAUDE_MARKETPLACE_MANIFEST))) {
      return { applies: false, reason: `no ${CLAUDE_MARKETPLACE_MANIFEST}` };
    }
    if (!claudeOnPath()) {
      return { applies: false, reason: 'claude is not installed' };
    }
    return { applies: true };
  },
  listOrphans: (context) => {
    const registry = claudeInstalledPluginsPath(context.env);

    if (!existsSync(registry)) {
      return { checkouts: [], kind: 'ok' };
    }

    try {
      const installed: unknown = JSON.parse(readFileSync(registry, 'utf8'));
      const checkouts = findOrphanedClaudeCheckouts({ exists: existsSync, installed, primary: context.primary }); // prettier-ignore
      return { checkouts, kind: 'ok' };
    } catch (error) {
      return { kind: 'failed', message: `could not read ${registry}: ${error instanceof Error ? error.message : String(error)}` }; // prettier-ignore
    }
  },
  optOutEnv: CLAUDE_PLUGINS_OPT_OUT_ENV,
  register: (checkout, context) => {
    const result = ensureCheckoutClaudePlugins(checkout, context.primary, context.env); // prettier-ignore
    const line = describeClaudePluginsResult(result, context.primary);

    if (result.kind === 'skipped' || line === undefined) {
      return { kind: 'skipped', reason: result.kind === 'skipped' ? result.reason : 'nothing to do' }; // prettier-ignore
    }
    return line.level === 'info'
      ? { kind: 'ok', message: line.message }
      : { kind: 'failed', message: line.message };
  },
  unregister: (checkout, context) => {
    const result = removeCheckoutClaudePlugins(checkout, context.primary, context.env); // prettier-ignore

    switch (result.kind) {
      case 'failed': {
        return { kind: 'failed', message: `claude: ${result.message}` };
      }
      case 'ok': {
        const removed = result.removed.length > 0 ? result.removed.join(', ') : 'nothing (already gone)'; // prettier-ignore
        return { kind: 'ok', message: `🔌 claude: uninstalled ${removed} for this checkout (--keep-data)` }; // prettier-ignore
      }
      case 'skipped': {
        return { kind: 'skipped', reason: result.reason };
      }
    }
  },
};

/**
 * Every per-checkout agent registration this repo provisions. Today that is
 * Claude alone (see `docs/monorepo/agent-editor-folders.md` §7 for why the
 * other agents need none); a new one is a new entry, register and unregister
 * together.
 */
export const AGENT_CHECKOUT_REGISTRATIONS: readonly AgentCheckoutRegistration[] =
  [claudeRegistration];

/**
 * Run one half of every entry for `checkout`. Never throws: an opt-out, an
 * unmet precondition or a throwing step becomes that entry's outcome, and the
 * loop always reaches every entry.
 */
export const runAgentCheckoutRegistrations = (params: {
  readonly checkout: string;
  readonly context: AgentCheckoutContext;
  readonly entries: readonly AgentCheckoutRegistration[];
  readonly operation: AgentCheckoutOperation;
}): AgentCheckoutResult[] => {
  const { checkout, context, entries, operation } = params;

  return entries.map((entry) => {
    if (context.env[entry.optOutEnv] === '0') {
      return { agent: entry.agent, outcome: { kind: 'skipped', reason: `${entry.optOutEnv}=0` } }; // prettier-ignore
    }

    try {
      const applies = entry.applies(checkout, context);
      if (!applies.applies) {
        return { agent: entry.agent, outcome: { kind: 'skipped', reason: applies.reason } }; // prettier-ignore
      }
      return { agent: entry.agent, outcome: entry[operation](checkout, context) }; // prettier-ignore
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { agent: entry.agent, outcome: { kind: 'failed', message: `${entry.agent}: ${message}` } }; // prettier-ignore
    }
  });
};

/** Run `operation` for `checkout` against the real registry, or [] outside a git checkout. */
const runForCheckout = (
  operation: AgentCheckoutOperation,
  checkout: string,
  env: NodeJS.ProcessEnv,
): AgentCheckoutResult[] => {
  const primary = primaryCheckoutDir(checkout);

  if (primary === undefined) {
    return [];
  }

  return runAgentCheckoutRegistrations({
    checkout,
    context: { env, primary },
    entries: AGENT_CHECKOUT_REGISTRATIONS,
    operation,
  });
};

/** Provisioning entry: register `checkout` with every agent that applies. */
export const registerCheckoutAgents = (
  checkout: string,
  env: NodeJS.ProcessEnv,
): AgentCheckoutResult[] => {
  return runForCheckout('register', checkout, env);
};

/** Teardown entry: unregister `checkout` from every agent that applies. Call before deleting it. */
export const unregisterCheckoutAgents = (
  checkout: string,
  env: NodeJS.ProcessEnv,
): AgentCheckoutResult[] => {
  return runForCheckout('unregister', checkout, env);
};

/** The filesystem the sweep touches; injected for tests. */
export interface OrphanSweepFs {
  readonly exists: (path: string) => boolean;
  /** `mkdir -p`; returns the topmost directory it created, or undefined when it created none. */
  readonly makeDir: (path: string) => string | undefined;
  /** `rm -rf`, only ever called on a directory {@link OrphanSweepFs.makeDir} just created. */
  readonly removeDir: (path: string) => void;
}

const realSweepFs: OrphanSweepFs = {
  exists: existsSync,
  makeDir: (path) => {
    return mkdirSync(path, { recursive: true });
  },
  removeDir: (path) => {
    rmSync(path, { force: true, recursive: true });
  },
};

/** What the sweep did, or would do, for one orphaned checkout. */
export interface OrphanSweepItem {
  readonly checkout: string;
  readonly outcome: AgentCheckoutOutcome;
}

/** One agent's sweep result. */
export type AgentOrphanSweep =
  | {
      readonly agent: string;
      readonly dryRun: boolean;
      readonly items: readonly OrphanSweepItem[];
      readonly kind: 'ok';
    }
  | {
      readonly agent: string;
      readonly kind: 'failed';
      readonly message: string;
    }
  | {
      readonly agent: string;
      readonly kind: 'skipped';
      readonly reason: string;
    };

/**
 * The nearest existing ancestor that is inside a git checkout, or undefined.
 * An agent CLI run from a recreated directory there could resolve the
 * enclosing repository's root instead, and unregister THAT, so such an orphan
 * is never swept automatically.
 */
const enclosingCheckout = (
  path: string,
  exists: (path: string) => boolean,
): string | undefined => {
  let dir = dirname(path);

  while (dir !== dirname(dir)) {
    if (exists(join(dir, '.git'))) {
      return dir;
    }
    dir = dirname(dir);
  }

  return undefined;
};

/** Unregister one orphan: recreate its directory, run the entry's unregister in it, remove only what was created. */
const sweepOrphan = (params: {
  readonly checkout: string;
  readonly context: AgentCheckoutContext;
  readonly dryRun: boolean;
  readonly entry: AgentCheckoutRegistration;
  readonly fs: OrphanSweepFs;
}): AgentCheckoutOutcome => {
  const { checkout, context, dryRun, entry, fs } = params;

  if (fs.exists(checkout)) {
    return { kind: 'skipped', reason: 'the path exists again; not an orphan, not touched' }; // prettier-ignore
  }

  const enclosing = enclosingCheckout(checkout, fs.exists);
  if (enclosing !== undefined) {
    return { kind: 'skipped', reason: `inside the git checkout ${enclosing}; the CLI could resolve that repository instead, so remove it by hand` }; // prettier-ignore
  }

  if (dryRun) {
    return { kind: 'ok', message: 'would unregister' };
  }

  const created = fs.makeDir(checkout);
  try {
    return entry.unregister(checkout, context);
  } catch (error) {
    return { kind: 'failed', message: error instanceof Error ? error.message : String(error) }; // prettier-ignore
  } finally {
    if (created !== undefined) {
      fs.removeDir(created);
    }
  }
};

/**
 * Unregister every registration whose checkout is gone, per agent: the
 * manual recipe (recreate the empty directory, run the agent's own uninstall
 * in it, remove the directory) automated. Never edits an agent's registry
 * file; only deletes directories it created. Idempotent: an unregistered
 * orphan is no longer listed. Never throws.
 */
export const pruneAgentCheckoutOrphans = (params: {
  readonly context: AgentCheckoutContext;
  readonly dryRun: boolean;
  readonly entries: readonly AgentCheckoutRegistration[];
  readonly fs: OrphanSweepFs;
}): AgentOrphanSweep[] => {
  const { context, dryRun, entries, fs } = params;

  return entries.map((entry): AgentOrphanSweep => {
    const { agent } = entry;

    if (context.env[entry.optOutEnv] === '0') {
      return { agent, kind: 'skipped', reason: `${entry.optOutEnv}=0` };
    }

    try {
      const applies = entry.applies(context.primary, context);
      if (!applies.applies) {
        return { agent, kind: 'skipped', reason: applies.reason };
      }

      const orphans = entry.listOrphans(context);
      if (orphans.kind === 'failed') {
        return { agent, kind: 'failed', message: orphans.message };
      }

      const items = orphans.checkouts.map((checkout) => {
        return { checkout, outcome: sweepOrphan({ checkout, context, dryRun, entry, fs }) }; // prettier-ignore
      });
      return { agent, dryRun, items, kind: 'ok' };
    } catch (error) {
      return { agent, kind: 'failed', message: error instanceof Error ? error.message : String(error) }; // prettier-ignore
    }
  });
};

/** The sweep against the real registry and filesystem, from the checkout at `cwd`; [] outside git. */
export const pruneCheckoutAgentOrphans = (
  cwd: string,
  env: NodeJS.ProcessEnv,
  dryRun: boolean,
): AgentOrphanSweep[] => {
  const primary = primaryCheckoutDir(cwd);

  if (primary === undefined) {
    return [];
  }

  return pruneAgentCheckoutOrphans({
    context: { env, primary },
    dryRun,
    entries: AGENT_CHECKOUT_REGISTRATIONS,
    fs: realSweepFs,
  });
};

/** Log sweep results grouped by agent. Returns true when any agent or orphan failed. */
export const logAgentOrphanSweeps = (
  sweeps: readonly AgentOrphanSweep[],
  logger: Logger,
): boolean => {
  let failed = false;

  for (const sweep of sweeps) {
    if (sweep.kind === 'skipped') {
      logger.info(`${sweep.agent}: skipped (${sweep.reason})`);
      continue;
    }
    if (sweep.kind === 'failed') {
      logger.warn(`${sweep.agent}: ${sweep.message}`);
      failed = true;
      continue;
    }
    if (sweep.items.length === 0) {
      logger.success(`${sweep.agent}: no orphaned checkout registrations`);
      continue;
    }

    const verb = sweep.dryRun ? 'would unregister' : 'unregistering';
    logger.step(`${sweep.agent}: ${sweep.items.length} orphaned checkout(s), ${verb}:`); // prettier-ignore
    for (const { checkout, outcome } of sweep.items) {
      if (outcome.kind === 'failed') {
        failed = true;
        logger.warn(`  ${checkout}: ${outcome.message}`);
      } else if (outcome.kind === 'skipped') {
        logger.detail(`${checkout}: skipped (${outcome.reason})`);
      } else {
        logger.detail(sweep.dryRun ? checkout : `${checkout}: ${outcome.message}`); // prettier-ignore
      }
    }
  }

  return failed;
};

/** Log each result worth telling the operator about; skips stay silent unless `verbose`. */
export const logAgentCheckoutResults = (
  results: readonly AgentCheckoutResult[],
  logger: Logger,
): void => {
  for (const { agent, outcome } of results) {
    switch (outcome.kind) {
      case 'failed': {
        logger.warn(outcome.message);
        break;
      }
      case 'ok': {
        logger.info(outcome.message);
        break;
      }
      case 'skipped': {
        logger.detail(`${agent}: skipped (${outcome.reason})`);
        break;
      }
    }
  }
};
