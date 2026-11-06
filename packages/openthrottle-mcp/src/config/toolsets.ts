/**
 * @description Named toolsets the openthrottle-mcp server can serve (OT plan d7266de7). Every tool in
 * {@link developerMcpToolDefinitions} belongs to exactly one toolset. A client gets `core` unless it
 * opts into more, because every schema a client loads costs bytes in every session, and a coding
 * session has no use for blog or admin schemas.
 *
 * Selection is per process: `--toolsets=<names>` on the command line wins over the
 * `OPENTHROTTLE_MCP_TOOLSETS` environment variable. Both take a comma list of toolset names or `all`.
 * `core` is always served, so naming `blog` means core + blog and no configuration can drop health or
 * plan tools.
 */

/**
 * @description Every toolset name, alphabetized.
 * @public
 */
export const TOOLSET_NAMES = ['admin', 'agents', 'blog', 'core'] as const;

/** @public */
export type ToolsetName = (typeof TOOLSET_NAMES)[number];

/**
 * @description One line per toolset, used in the server instructions and the `health` result to
 * point a client at what it has not loaded.
 */
export const TOOLSET_DESCRIPTIONS: Readonly<Record<ToolsetName, string>> = {
  admin: `skill, plan, task and project tags; tag-action rules; skill availability`,
  agents: 'local agent CLIs and models; agent conversations',
  blog: 'blog posts, tags and authors',
  core: `plans, tasks, notes, plan output and runs, work sessions, knowledge base`,
};

/** @description The toolset served whatever the configuration says. */
export const ALWAYS_ON_TOOLSET: ToolsetName = 'core';

/** @description What a client gets with no configuration. */
export const DEFAULT_TOOLSETS: readonly ToolsetName[] = [ALWAYS_ON_TOOLSET];

export const TOOLSETS_ENV = 'OPENTHROTTLE_MCP_TOOLSETS';
export const TOOLSETS_FLAG = '--toolsets';
export const ALL_TOOLSETS_ALIAS = 'all';

/**
 * @description The outcome of reading a toolset selection: the enabled set, or why it was rejected.
 */
export type ToolsetResolution =
  | { readonly error: string; readonly ok: false }
  | { readonly ok: true; readonly toolsets: ReadonlySet<ToolsetName> };

const isToolsetName = (value: string): value is ToolsetName => {
  return TOOLSET_NAMES.some((name) => name === value);
};

/**
 * @description Parses a comma list of toolset names (or `all`) into the enabled set. Blank input is
 * the default set. An unknown name is an error rather than being ignored, so a typo in a client's
 * config fails at boot instead of silently serving less than was asked for.
 */
export const parseToolsets = (raw: string | undefined): ToolsetResolution => {
  const enabled = new Set<ToolsetName>(DEFAULT_TOOLSETS);
  const unknown: string[] = [];
  const tokens = (raw ?? '')
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token !== '');

  for (const token of tokens) {
    if (token === ALL_TOOLSETS_ALIAS) {
      TOOLSET_NAMES.forEach((name) => enabled.add(name));
    } else if (isToolsetName(token)) {
      enabled.add(token);
    } else {
      unknown.push(token);
    }
  }

  if (unknown.length > 0) {
    return {
      error: `Unknown openthrottle-mcp toolset(s): ${unknown.join(', ')}. Valid: ${TOOLSET_NAMES.join(', ')}, or ${ALL_TOOLSETS_ALIAS}.`,
      ok: false,
    };
  }

  return { ok: true, toolsets: enabled };
};

/**
 * @description The value of `--toolsets=<v>` or `--toolsets <v>` in `argv`, or undefined when absent.
 */
const readToolsetsFlag = (argv: readonly string[]): string | undefined => {
  const prefix = `${TOOLSETS_FLAG}=`;
  const index = argv.findIndex(
    (arg) => arg === TOOLSETS_FLAG || arg.startsWith(prefix),
  );
  const arg = argv[index];
  if (arg === undefined) {
    return undefined;
  }

  return arg === TOOLSETS_FLAG ? (argv[index + 1] ?? '') : arg.slice(prefix.length); // prettier-ignore
};

/**
 * @description Resolves the enabled toolsets from a command line and an environment. The flag wins
 * over the environment variable.
 */
export const resolveToolsets = (
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): ToolsetResolution => {
  return parseToolsets(readToolsetsFlag(argv) ?? env[TOOLSETS_ENV]);
};

/**
 * @description Resolves the enabled toolsets for this process. Throws on an invalid selection: it is
 * called while booting a server, where refusing to start is the wanted behaviour.
 */
export const enabledToolsetsFromProcess = (): ReadonlySet<ToolsetName> => {
  const resolution = resolveToolsets(process.argv.slice(2), process.env);
  if (!resolution.ok) {
    throw new Error(resolution.error);
  }

  return resolution.toolsets;
};

/**
 * @description Toolsets in {@link TOOLSET_NAMES} order that are not in `enabled`.
 */
export const disabledToolsets = (
  enabled: ReadonlySet<ToolsetName>,
): ToolsetName[] => {
  return TOOLSET_NAMES.filter((name) => !enabled.has(name));
};

let activeToolsets: ReadonlySet<ToolsetName> = new Set(DEFAULT_TOOLSETS);

/**
 * @description Records the toolsets this process serves, so `health` can report them. Called by
 * every boot path once it has resolved them.
 */
export const setActiveToolsets = (toolsets: ReadonlySet<ToolsetName>): void => {
  activeToolsets = toolsets;
};

/** @description The toolsets this process serves; the default set until a boot path records one. */
export const getActiveToolsets = (): ReadonlySet<ToolsetName> => {
  return activeToolsets;
};
