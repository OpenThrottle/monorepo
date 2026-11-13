/**
 * @description Codex project trust for OpenThrottle worktrees. Codex loads a
 * project's committed `.codex/config.toml` (MCP servers) and
 * `.codex/rules/default.rules` (push denies) only when the project is trusted
 * in the USER config (`[projects."<path>"] trust_level = "trusted"` in
 * `$CODEX_HOME/config.toml`). `-c projects…trust_level` does not work.
 *
 * Codex resolves a linked worktree to its PRIMARY checkout for trust (probed,
 * codex-cli 0.167.0): one entry for the primary path covers every worktree,
 * while an entry for an ancestor directory covers nothing. So provisioning
 * ensures that one entry and teardown never removes it — the primary checkout
 * outlives its worktrees, and per-worktree entries would go stale.
 *
 * Owner-approved policy (OT plan 00beee78): writing user config is allowed
 * here, but only additively, only when codex is installed, and never over an
 * explicit non-trusted entry. `OPENTHROTTLE_CODEX_TRUST=0` opts out.
 *
 * Dependency-free (node builtins + ./exec.ts + ./git.ts): provision and heal run under
 * bare Node before `pnpm install`.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { run } from './exec.ts';
import { primaryCheckoutDir } from './git.ts';

/** What the user config says about a project path. */
export type CodexTrustState = 'absent' | 'other' | 'trusted';

/** Outcome of {@link ensureCodexProjectTrust}. */
export type EnsureCodexTrustResult =
  | { readonly kind: 'added'; readonly configPath: string }
  | { readonly kind: 'declined'; readonly configPath: string }
  | { readonly kind: 'failed'; readonly message: string }
  | { readonly kind: 'present'; readonly configPath: string }
  | { readonly kind: 'skipped'; readonly reason: string };

export interface EnsureCodexTrustOptions {
  /** Environment to read CODEX_HOME / the opt-out from. */
  readonly env: NodeJS.ProcessEnv;
  /** Whether a `codex` binary is on PATH; injected for tests. */
  readonly isCodexInstalled: () => boolean;
  /** Absolute path of the project to trust (the primary checkout). */
  readonly projectPath: string;
}

/** The env switch that turns the write off. */
export const CODEX_TRUST_OPT_OUT_ENV = 'OPENTHROTTLE_CODEX_TRUST';

/** `$CODEX_HOME/config.toml`, defaulting CODEX_HOME to `~/.codex`. */
export const codexConfigPath = (env: NodeJS.ProcessEnv): string => {
  const home = env.CODEX_HOME;

  return join(home !== undefined && home !== '' ? home : join(homedir(), '.codex'), 'config.toml'); // prettier-ignore
};

/** The TOML table header for a project path (a JSON string is a valid TOML basic string). */
export const codexProjectHeader = (projectPath: string): string => {
  return `[projects.${JSON.stringify(projectPath)}]`;
};

/**
 * Read the trust level recorded for `projectPath` in a codex config's text.
 * Line-based, not a TOML parser: it finds the exact table header and reads
 * `trust_level` until the next table. `other` means the user set something
 * other than "trusted" (e.g. "untrusted"), which is never overwritten.
 */
export const codexTrustState = (
  content: string,
  projectPath: string,
): CodexTrustState => {
  const header = codexProjectHeader(projectPath);
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === header);

  if (start === -1) {
    return 'absent';
  }

  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[')) {
      break;
    }

    const match = /^trust_level\s*=\s*["']([^"']*)["']/.exec(trimmed);

    if (match !== null) {
      return match[1] === 'trusted' ? 'trusted' : 'other';
    }
  }

  return 'other';
};

/** True when a `codex` binary resolves on PATH. */
export const codexOnPath = (): boolean => {
  return run('codex', ['--version'], { allowFailure: true }).exitCode === 0;
};

/** A log line for a result worth telling the operator about; undefined when there is nothing new. */
export const describeCodexTrustResult = (
  result: EnsureCodexTrustResult,
  projectPath: string,
):
  { readonly level: 'info' | 'warn'; readonly message: string } | undefined => {
  switch (result.kind) {
    case 'added': {
      return { level: 'info', message: `🔐 trusted ${projectPath} for codex in ${result.configPath} (covers every worktree; ${CODEX_TRUST_OPT_OUT_ENV}=0 opts out)` }; // prettier-ignore
    }
    case 'declined': {
      return { level: 'warn', message: `codex: ${result.configPath} sets a non-trusted trust_level for ${projectPath}; left as is, so codex runs in this worktree skip .codex/config.toml` }; // prettier-ignore
    }
    case 'failed': {
      return { level: 'warn', message: `codex: could not record project trust: ${result.message}` }; // prettier-ignore
    }
    case 'present':
    case 'skipped': {
      return undefined;
    }
  }
};

/**
 * Idempotently append a trust entry for `projectPath` to the user's codex
 * config. Never throws: a failure is returned, so provisioning can log it and
 * carry on (codex trust is a convenience, not a precondition of a worktree).
 */
export const ensureCodexProjectTrust = (
  options: EnsureCodexTrustOptions,
): EnsureCodexTrustResult => {
  const { env, isCodexInstalled, projectPath } = options;

  if (env[CODEX_TRUST_OPT_OUT_ENV] === '0') {
    return { kind: 'skipped', reason: `${CODEX_TRUST_OPT_OUT_ENV}=0` };
  }

  if (!isCodexInstalled()) {
    return { kind: 'skipped', reason: 'codex is not installed' };
  }

  const configPath = codexConfigPath(env);

  try {
    const content = existsSync(configPath) ? readFileSync(configPath, 'utf8') : ''; // prettier-ignore
    const state = codexTrustState(content, projectPath);

    if (state === 'trusted') {
      return { configPath, kind: 'present' };
    }

    if (state === 'other') {
      return { configPath, kind: 'declined' };
    }

    const separator =
      content === '' ? '' : content.endsWith('\n') ? '\n' : '\n\n';

    mkdirSync(dirname(configPath), { recursive: true });
    appendFileSync(configPath, `${separator}${codexProjectHeader(projectPath)}\ntrust_level = "trusted"\n`); // prettier-ignore

    return { configPath, kind: 'added' };
  } catch (error) {
    return { kind: 'failed', message: error instanceof Error ? error.message : String(error) }; // prettier-ignore
  }
};

/**
 * Provision/heal entry: ensure the codex trust entry for the primary checkout
 * that owns `cwd`, and return the line worth logging (if any).
 */
export const ensurePrimaryCheckoutCodexTrust = (
  cwd: string,
  env: NodeJS.ProcessEnv,
): ReturnType<typeof describeCodexTrustResult> => {
  const primary = primaryCheckoutDir(cwd);

  if (primary === undefined) {
    return undefined;
  }

  return describeCodexTrustResult(
    ensureCodexProjectTrust({ env, isCodexInstalled: codexOnPath, projectPath: primary }), // prettier-ignore
    primary,
  );
};
