/**
 * How a Claude hook bundle learns about the host it runs under, in three sections.
 *
 * - Bundle host: {@link detectClaudeBundleHost} and {@link resolveBundleHostProjectDir} say which
 *   tool is running a Claude bundle.
 * - Reporter session: {@link resolveReporterSession} says which agent session an outcome report
 *   belongs to.
 * - Repo-hook shadowing: {@link isShadowedByRepoHooks} stands the plugin copy of a hook down when
 *   the repository registers the same one.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { isPathInside } from '../data/heartbeat.ts';
import type { ReporterSessionCandidate } from '../data/starts.ts';
import { pickReporterSession } from '../data/starts.ts';
import { resolveAntigravityPluginsDir } from './antigravity-marketplace-install.ts';
import { ANTIGRAVITY_SOURCE } from './antigravity-payload.ts';
import { CLAUDE_SOURCE, readClaudeShellSessionId } from './claude-payload.ts';
import {
  resolveCodexHome,
  resolveCodexMarketplaceCacheDir,
} from './codex-marketplace-install.ts';
import { CODEX_SOURCE, readCodexShellSessionId } from './codex-payload.ts';
import { CURSOR_SOURCE, readCursorShellSessionId } from './cursor-payload.ts';

// ── Bundle host ──
// Which tool is running a Claude bundle. The marketplace plugin's hooks are the Claude bundles, and
// cursor-agent, codex and agy all run them — so without this check every marketplace install reached
// through another tool reports itself as a Claude Code session (OT plan `8f9ce368`;
// docs/monorepo/agent-cli-hook-capability-matrix.md § Which tool is running the Claude bundles).
//
// Only per-hook markers count. A hook inherits its host's whole environment, so `CLAUDECODE` and
// friends reach a cursor-agent hook whenever cursor-agent was started from a Claude Code session.
// Any doubt means `claude-code`, which is what every bundle reported before this check existed.

/**
 * The tools known to run a Claude bundle; each value is that tool's telemetry `source` id.
 *
 * @public
 */
export const CLAUDE_BUNDLE_HOSTS = [
  ANTIGRAVITY_SOURCE,
  CLAUDE_SOURCE,
  CODEX_SOURCE,
  CURSOR_SOURCE,
] as const;

/** @public */
export type ClaudeBundleHost = (typeof CLAUDE_BUNDLE_HOSTS)[number];

/** @public */
export interface ClaudeBundleHostContext {
  readonly env: NodeJS.ProcessEnv;
  readonly homeDir: string;
  /** The running script, absolute (`process.argv[1]`). */
  readonly scriptPath: string | undefined;
}

/** True when `scriptPath` lives strictly inside `dir`. */
const scriptIsInside = (
  dir: string | undefined,
  scriptPath: string | undefined,
): boolean => {
  const root = dir?.trim();
  if (!root || !scriptPath) {
    return false;
  }
  return isPathInside(root, scriptPath);
};

/**
 * Cursor sets `CURSOR_PLUGIN_ROOT` and `CLAUDE_PLUGIN_ROOT` to the same directory for a plugin
 * hook; Claude Code never sets the first. Requiring both to agree, with the script under them,
 * rules out a `CURSOR_PLUGIN_ROOT` that leaked in from somewhere else.
 */
const isCursorHost = ({
  env,
  scriptPath,
}: ClaudeBundleHostContext): boolean => {
  const cursorRoot = env.CURSOR_PLUGIN_ROOT?.trim();
  const claudeRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!cursorRoot || !claudeRoot) {
    return false;
  }
  return (
    path.resolve(cursorRoot) === path.resolve(claudeRoot) &&
    scriptIsInside(cursorRoot, scriptPath)
  );
};

/**
 * The tool running this Claude bundle, first match wins: a script under agy's plugins directory;
 * a script under codex's marketplace cache; Cursor's plugin-root pair; otherwise Claude Code.
 *
 * @public
 */
export const detectClaudeBundleHost = ({
  env = process.env,
  homeDir = os.homedir(),
  scriptPath = process.argv[1],
}: Partial<ClaudeBundleHostContext> = {}): ClaudeBundleHost => {
  const context = { env, homeDir, scriptPath };
  if (scriptIsInside(resolveAntigravityPluginsDir(homeDir), scriptPath)) {
    return ANTIGRAVITY_SOURCE;
  }
  const codexCache = resolveCodexMarketplaceCacheDir(
    resolveCodexHome(env, homeDir),
  );
  if (scriptIsInside(codexCache, scriptPath)) {
    return CODEX_SOURCE;
  }
  if (isCursorHost(context)) {
    return CURSOR_SOURCE;
  }
  return CLAUDE_SOURCE;
};

/**
 * The launch directory a host hands its hooks. Cursor sets `CURSOR_PROJECT_DIR`; codex runs a hook
 * in the session's cwd; agy runs it in the plugin folder, which is no checkout, so the repository
 * comes from the payload's `cwd` instead. `CLAUDE_PROJECT_DIR` is ignored for the other hosts — it
 * may be inherited from a Claude Code session that launched them.
 *
 * @public
 */
export const resolveBundleHostProjectDir = (
  host: ClaudeBundleHost,
  env: NodeJS.ProcessEnv = process.env,
): string => {
  if (host === CLAUDE_SOURCE) {
    return (
      env.CLAUDE_PROJECT_DIR || env.OPEN_THROTTLE_REPO_ROOT || process.cwd()
    );
  }
  if (host === CURSOR_SOURCE && env.CURSOR_PROJECT_DIR) {
    return env.CURSOR_PROJECT_DIR;
  }
  return env.OPEN_THROTTLE_REPO_ROOT || process.cwd();
};

// ── Reporter session ──
// Which agent session a deliberate outcome report belongs to. The reporter
// (`../scripts/claude-outcome.ts`) is one bundle shipped in the Claude, Codex and Cursor
// payloads and run from whichever agent's shell a skill is in, so it must find
// that agent's own session id — the one its capture hook wrote the start under
// — and stamp that agent's `source`.
//
// Each tool's shell variables are read by that tool's payload module; this section only
// orders them. The neutral core (`pickReporterSession`) then picks the
// candidate whose session actually holds an open start for the skill, which is
// what resolves a nested launch (cursor-agent started from a Claude Code
// session sees both tools' ids).

/** The producers the reporter can attribute a report to. @public */
export type ReporterHost =
  typeof CLAUDE_SOURCE | typeof CODEX_SOURCE | typeof CURSOR_SOURCE;

/** A candidate session attributed to a producer the reporter knows. @public */
export interface ReporterHostCandidate extends ReporterSessionCandidate {
  readonly source: ReporterHost;
}

/**
 * Where a report goes. `attributed` names the session and producer to stamp;
 * `unattributable` means the shell belongs to an agent no adapter can attribute
 * a report to yet, and the report must not be written: stamping it with another
 * producer's id is the mislabel this resolver exists to prevent.
 *
 * @public
 */
export type ReporterSession =
  | {
      readonly kind: 'attributed';
      readonly sessionId: string | null;
      readonly source: ReporterHost;
    }
  | {
      readonly host: string;
      readonly kind: 'unattributable';
    };

/**
 * Agents whose shells the reporter can recognise but not attribute: each marks
 * its shell tool's environment, none exports a session id to it (read from the
 * shipped code: Gemini CLI 0.25.2 `shellExecutionService` sets only
 * `GEMINI_CLI=1`; OpenCode 1.19.5 sets `OPENCODE=1`, `AGENT=1` and
 * `OPENCODE_PID` process-wide), and none has a capture adapter. Status per
 * agent: docs/monorepo/agent-cli-hook-capability-matrix.md.
 */
const UNATTRIBUTABLE_HOST_MARKERS: ReadonlyArray<
  readonly [host: string, envVar: string]
> = [
  ['gemini-cli', 'GEMINI_CLI'],
  ['opencode', 'OPENCODE'],
];

/** The first unattributable agent the environment names, or null. @public */
export const detectUnattributableHost = (
  env: NodeJS.ProcessEnv,
): string | null => {
  const found = UNATTRIBUTABLE_HOST_MARKERS.find(([, envVar]) => {
    return env[envVar] === '1';
  });
  return found?.[0] ?? null;
};

const isReporterHost = (value: string): value is ReporterHost => {
  return (
    value === CLAUDE_SOURCE || value === CODEX_SOURCE || value === CURSOR_SOURCE
  );
};

/**
 * Every session id the environment offers, innermost-likely first: Codex and
 * Cursor before Claude Code, because the common nesting is a Claude Code
 * session launching another agent (whose shell then inherits
 * `CLAUDE_CODE_SESSION_ID`), and the order only matters when no candidate holds
 * a start.
 *
 * @public
 */
export const listReporterSessionCandidates = (
  env: NodeJS.ProcessEnv,
): ReporterHostCandidate[] => {
  const readers: ReadonlyArray<
    readonly [ReporterHost, (e: NodeJS.ProcessEnv) => string | null]
  > = [
    [CODEX_SOURCE, readCodexShellSessionId],
    [CURSOR_SOURCE, readCursorShellSessionId],
    [CLAUDE_SOURCE, readClaudeShellSessionId],
  ];
  const out: ReporterHostCandidate[] = [];
  for (const [source, read] of readers) {
    const sessionId = read(env);
    if (sessionId) {
      out.push({ sessionId, source });
    }
  }
  return out;
};

/**
 * Resolve the session and producer for one report.
 *
 * An explicit session (`--session` or `OPENTHROTTLE_TELEMETRY_SESSION_ID`)
 * always wins; its source is the explicit `--source` /
 * `OPENTHROTTLE_TELEMETRY_SOURCE` when that names a known producer, else the
 * environment's best candidate, else Claude Code (what every report said before
 * this resolver existed). Without one, the candidate whose session holds an
 * open start for `skillName` wins. When none holds one and the shell is an
 * unattributable agent's ({@link detectUnattributableHost}), the report is
 * `unattributable`: a session id inherited from a parent agent is not this
 * shell's.
 *
 * @public
 */
export const resolveReporterSession = ({
  env,
  explicitSessionId,
  explicitSource,
  skillName,
  startsDir,
}: {
  readonly env: NodeJS.ProcessEnv;
  readonly explicitSessionId: string | null;
  readonly explicitSource: string | null;
  readonly skillName: string;
  readonly startsDir?: string;
}): ReporterSession => {
  const candidates = listReporterSessionCandidates(env);
  const named =
    explicitSource && isReporterHost(explicitSource) ? explicitSource : null;

  if (explicitSessionId) {
    const source = named ?? candidates[0]?.source ?? CLAUDE_SOURCE;
    return { kind: 'attributed', sessionId: explicitSessionId, source };
  }

  const scoped = named
    ? candidates.filter((candidate) => candidate.source === named)
    : candidates;
  const picked = pickReporterSession({
    candidates: scoped,
    skillName,
    startsDir,
  });
  const unattributable = named ? null : detectUnattributableHost(env);
  if (unattributable && !picked?.holdsStart) {
    return { host: unattributable, kind: 'unattributable' };
  }
  if (!picked) {
    return {
      kind: 'attributed',
      sessionId: null,
      source: named ?? CLAUDE_SOURCE,
    };
  }
  return {
    kind: 'attributed',
    sessionId: picked.candidate.sessionId,
    source: picked.candidate.source,
  };
};

// ── Repo-hook shadowing ──
// Plugin-vs-repo dedupe for Claude Code. Inside a repository whose own
// `.claude/settings.json` registers the skill-usage hooks, the user-scoped
// plugin registers the SAME hooks again, so each Skill call was captured
// twice (96 twins, OT plan e7b74d81). When both are present the repository's
// registration wins and the plugin copy stands down.
//
// The server refuses duplicates too (migration 134); this removes the second
// POST at its source. Fail-open in the direction of capturing: any doubt —
// unreadable or invalid settings, no plugin root — means "not shadowed".

/** The bundle name both registrations point at, unless the caller names another hook's. */
const CAPTURE_BUNDLE = 'skill-usage-capture';

/**
 * True when THIS process is the plugin's copy of a hook: Claude Code sets
 * `CLAUDE_PLUGIN_ROOT` for plugin hooks, and the running script lives under it.
 */
const runningFromPlugin = (
  env: NodeJS.ProcessEnv,
  scriptPath: string | undefined,
): boolean => {
  const pluginRoot = env.CLAUDE_PLUGIN_ROOT?.trim();
  if (!pluginRoot || !scriptPath) {
    return false;
  }
  const relative = path.relative(path.resolve(pluginRoot), scriptPath);
  return relative !== '' && !relative.startsWith('..');
};

/** True when the repo's own settings register the hook bundle `bundle`. */
const repoRegistersBundle = (repoRoot: string, bundle: string): boolean => {
  try {
    const raw = fs.readFileSync(
      path.join(repoRoot, '.claude', 'settings.json'),
      'utf8',
    );
    // Claude Code drops a settings file it cannot parse, so an unparseable
    // one registers nothing and the plugin must keep capturing.
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('hooks' in parsed)) {
      return false;
    }
    return JSON.stringify(parsed.hooks).includes(bundle);
  } catch {
    return false;
  }
};

/**
 * Whether this hook invocation should stand down because the repository's
 * own registration of the same hook will handle it.
 *
 * @public
 */
export const isShadowedByRepoHooks = ({
  bundle = CAPTURE_BUNDLE,
  env = process.env,
  repoRoot,
  scriptPath = process.argv[1],
}: {
  /** The hook bundle to look for in the repo's settings; defaults to capture. */
  bundle?: string;
  env?: NodeJS.ProcessEnv;
  repoRoot: string;
  scriptPath?: string;
}): boolean => {
  return (
    runningFromPlugin(env, scriptPath) && repoRegistersBundle(repoRoot, bundle)
  );
};
