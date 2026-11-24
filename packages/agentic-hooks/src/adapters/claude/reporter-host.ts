/**
 * Which agent session a deliberate outcome report belongs to. The reporter
 * (`./outcome.ts`) is one bundle shipped in the Claude, Codex and Cursor
 * payloads and run from whichever agent's shell a skill is in, so it must find
 * that agent's own session id — the one its capture hook wrote the start under
 * — and stamp that agent's `source`.
 *
 * Each tool's shell variables are read by that tool's adapter; this module only
 * orders them. The neutral core ({@link pickReporterSession}) then picks the
 * candidate whose session actually holds an open start for the skill, which is
 * what resolves a nested launch (cursor-agent started from a Claude Code
 * session sees both tools' ids).
 */
import type { ReporterSessionCandidate } from '../../data/starts.ts';
import { pickReporterSession } from '../../data/starts.ts';
import { CODEX_SOURCE, readCodexShellSessionId } from '../codex/payload.ts';
import { CURSOR_SOURCE, readCursorShellSessionId } from '../cursor/payload.ts';
import { CLAUDE_SOURCE, readClaudeShellSessionId } from './payload.ts';

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
