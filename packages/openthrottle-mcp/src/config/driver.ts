/**
 * @description Which agent CLI this MCP server was launched by, detected ONCE at stdio
 * startup so a plan run registers its true `driver` rather than whatever the
 * agent claims to be.
 *
 * Why detect at all, when the caller could just declare it? Because a declared value is
 * a guess, and `driver` is precisely the column run-provenance review exists
 * to read. An agent running under cursor-agent that confidently declares "claude" does
 * not produce a slightly-wrong row; it produces a row nothing downstream can tell is
 * wrong. So a detected value always wins, and a declared one is only ever a fallback.
 *
 * Why capture at stdio startup rather than read `process.env` inside the handler: the
 * handlers are shared with the Nest/HTTP surface, which runs INSIDE the OpenThrottle
 * server process. There the environment describes the SERVER, not the caller, and
 * detection would confidently report the same wrong driver for every request — worse
 * than declaring, because it cannot be overridden. Only {@link runServerLocal} captures,
 * so the HTTP surface detects nothing and falls back to the declared value. Same shape,
 * and same reasoning, as `./workspace-path.ts`.
 */

/**
 * The drivers `plan_runs.driver` accepts. Declared here rather than imported
 * so the MCP stays decoupled from the server's repositories layer; kept in lockstep with
 * the `plan_runs_driver_check` constraint (migrations 105, 106). The server is
 * the authority and rejects anything it does not accept — this union only shapes detection.
 */
export type PlanRunDriver =
  'antigravity' | 'claude' | 'codex' | 'cursor' | 'grok' | 'opencode';

/**
 * Environment signatures, most-specific first. Each entry is a variable the harness sets
 * in the environment of the processes it launches — including this MCP server.
 *
 * `CLAUDECODE` is verified: it is present, alongside CLAUDE_CODE_ENTRYPOINT and
 * CLAUDE_CODE_SESSION_ID, in a Claude-Code-launched stdio process. The rest are the
 * documented/observed markers for their harnesses and are BEST-EFFORT: if one is wrong or
 * a harness stops setting it, detection finds nothing and the declared value is used —
 * which is the designed fallback, not a failure. That is why this list may only ever grow
 * more specific, never guess: a marker that matches the wrong harness is worse than none.
 */
const DRIVER_ENV_MARKERS: readonly {
  readonly driver: PlanRunDriver;
  readonly variables: readonly string[];
}[] = [
  { driver: 'claude', variables: ['CLAUDECODE', 'CLAUDE_CODE_ENTRYPOINT'] },
  { driver: 'cursor', variables: ['CURSOR_AGENT', 'CURSOR_TRACE_ID'] },
  { driver: 'codex', variables: ['CODEX_SANDBOX', 'CODEX_THREAD_ID'] },
  { driver: 'antigravity', variables: ['ANTIGRAVITY_AGENT'] },
  { driver: 'opencode', variables: ['OPENCODE_SESSION_ID'] },
];

let detectedDriver: PlanRunDriver | null = null;

/**
 * @description Reads the harness marker out of an environment. Exported for tests; the
 * server calls {@link captureStdioDriver}. Returns null when nothing matches,
 * which is a legitimate answer — an unrecognised harness, or the HTTP surface.
 */
export const detectDriverFromEnv = (
  env: NodeJS.ProcessEnv,
): PlanRunDriver | null => {
  for (const marker of DRIVER_ENV_MARKERS) {
    const present = marker.variables.some(
      (variable) => (env[variable]?.trim() ?? '') !== '',
    );
    if (present) return marker.driver;
  }

  return null;
};

/**
 * @description Records the launching harness for this process. Stdio startup only — see
 * the module note. Pass null to clear it.
 */
export const captureStdioDriver = (
  driver: PlanRunDriver | null = detectDriverFromEnv(process.env),
): void => {
  detectedDriver = driver;
};

/** @description The detected driver, or null (nothing matched, or the HTTP surface). */
export const getDetectedDriver = (): PlanRunDriver | null => {
  return detectedDriver;
};

/**
 * @description The driver to register a run under. A DETECTED value always wins: an
 * agent's declaration is a guess, and silently poisoning the provenance column is worse
 * than ignoring the guess. The declared value is used only when detection found nothing.
 * Returns null when neither is available, which the caller must treat as a hard failure —
 * the column is CHECK-constrained and has no sensible default.
 */
export const resolveDriver = (
  declared: string | null | undefined,
): PlanRunDriver | string | null => {
  const detected = getDetectedDriver();
  if (detected !== null) return detected;

  const trimmed = declared?.trim() ?? '';

  return trimmed === '' ? null : trimmed;
};
