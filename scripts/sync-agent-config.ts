/**
 * @description Writes every agent tool's MCP config from the hand-authored
 * source of truth `.agents/agent-config.json`. Design and per-tool mapping:
 * docs/monorepo/agent-config-parity.md.
 *
 * Each output is one small pure `render*` function (model in, file text out)
 * registered in {@link OUTPUTS}. A later task adds the permission outputs as
 * further entries there.
 *
 *   pnpm exec tsx scripts/sync-agent-config.ts          write changed files
 *   pnpm exec tsx scripts/sync-agent-config.ts --check  fail on drift
 */
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import * as prettier from 'prettier';

import { createLogger, hasFlag, run } from './utils/index.ts';

const logger = createLogger();

const SOURCE_PATH = '.agents/agent-config.json';
const REGENERATE_COMMAND = 'pnpm exec tsx scripts/sync-agent-config.ts';

// Types

interface McpServerBase {
  readonly defaultOn: boolean;
  readonly description: string;
  readonly name: string;
}

export interface StdioServer extends McpServerBase {
  readonly args: readonly string[];
  readonly command: string;
  readonly transport: 'stdio';
}

export interface HttpServer extends McpServerBase {
  readonly transport: 'http';
  readonly url: string;
}

export type McpServer = HttpServer | StdioServer;

export interface ShellRule {
  /** Token prefixes Codex should forbid; only meaningful on deny rules. */
  readonly codexPrefixes: readonly (readonly string[])[];
  readonly kind: 'shell';
  readonly shell: string;
}

export interface McpServerRule {
  readonly kind: 'mcpServer';
  readonly mcpServer: string;
}

export type PermissionRule = McpServerRule | ShellRule;

/** The validated source of truth. Servers are sorted by name; rules keep SSOT order. */
export interface AgentConfig {
  readonly mcpServers: readonly McpServer[];
  readonly permissions: {
    readonly allow: readonly PermissionRule[];
    readonly deny: readonly PermissionRule[];
  };
}

export type ParseResult =
  | { readonly config: AgentConfig; readonly ok: true }
  | { readonly errors: readonly string[]; readonly ok: false };

type JsonObject = Record<string, unknown>;

// Parsing + validation

const isObject = (value: unknown): value is JsonObject => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isStringArray = (value: unknown): value is string[] => {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
};

const nonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value !== '';
};

const parseServer = (
  name: string,
  value: unknown,
): { readonly errors: string[] } | { readonly server: McpServer } => {
  if (!isObject(value)) {
    return { errors: [`mcpServers.${name}: must be an object`] };
  }

  const errors: string[] = [];
  const { args, command, defaultOn, description, transport, url } = value;

  if (typeof defaultOn !== 'boolean') {
    errors.push(`mcpServers.${name}.defaultOn: must be a boolean`);
  }

  if (!nonEmptyString(description)) {
    errors.push(`mcpServers.${name}.description: must be a non-empty string`);
  }

  if (transport !== 'stdio' && transport !== 'http') {
    errors.push(`mcpServers.${name}.transport: must be "stdio" or "http"`);
  }

  if (transport === 'stdio') {
    if (!nonEmptyString(command)) {
      errors.push(`mcpServers.${name}.command: required for stdio`);
    }

    if (!isStringArray(args)) {
      errors.push(`mcpServers.${name}.args: required string array for stdio`);
    }

    if (url !== undefined) {
      errors.push(`mcpServers.${name}.url: not allowed for stdio`);
    }
  }

  if (transport === 'http') {
    if (!nonEmptyString(url)) {
      errors.push(`mcpServers.${name}.url: required for http`);
    }

    if (command !== undefined || args !== undefined) {
      errors.push(`mcpServers.${name}: command/args not allowed for http`);
    }
  }

  if (
    errors.length > 0 ||
    typeof defaultOn !== 'boolean' ||
    !nonEmptyString(description)
  ) {
    return { errors };
  }

  const base = { defaultOn, description, name };

  if (transport === 'stdio' && nonEmptyString(command) && isStringArray(args)) {
    return { server: { ...base, args, command, transport } };
  }

  if (transport === 'http' && nonEmptyString(url)) {
    return { server: { ...base, transport, url } };
  }

  return { errors: [`mcpServers.${name}: unrecognised shape`] };
};

const parseCodexPrefixes = (
  where: string,
  value: unknown,
): { readonly errors: string[] } | { readonly prefixes: string[][] } => {
  if (value === undefined) {
    return { prefixes: [] };
  }

  if (!Array.isArray(value)) {
    return { errors: [`${where}.codexPrefixes: must be an array`] };
  }

  const prefixes: string[][] = [];
  const errors: string[] = [];

  for (const prefix of value) {
    if (
      isStringArray(prefix) &&
      prefix.length > 0 &&
      prefix.every((token) => token !== '')
    ) {
      // prettier-ignore
      prefixes.push(prefix);
    } else {
      errors.push(`${where}.codexPrefixes: each prefix must be a non-empty array of non-empty strings`); // prettier-ignore
    }
  }

  return errors.length > 0 ? { errors } : { prefixes };
};

const parseRule = (
  where: string,
  value: unknown,
  list: 'allow' | 'deny',
  serverNames: ReadonlySet<string>,
): { readonly errors: string[] } | { readonly rule: PermissionRule } => {
  if (!isObject(value)) {
    return { errors: [`${where}: must be an object`] };
  }

  const { codexPrefixes, mcpServer, shell } = value;
  const hasShell = shell !== undefined;
  const hasMcp = mcpServer !== undefined;

  if (hasShell === hasMcp) {
    return {
      errors: [`${where}: needs exactly one of "shell" or "mcpServer"`],
    };
  }

  if (typeof mcpServer === 'string') {
    if (codexPrefixes !== undefined) {
      return {
        errors: [`${where}: codexPrefixes only applies to shell rules`],
      };
    }

    if (!serverNames.has(mcpServer)) {
      return { errors: [`${where}.mcpServer: unknown server "${mcpServer}"`] };
    }

    return { rule: { kind: 'mcpServer', mcpServer } };
  }

  if (!nonEmptyString(shell)) {
    return {
      errors: [`${where}: "shell"/"mcpServer" must be a non-empty string`],
    };
  }

  if (list === 'allow' && codexPrefixes !== undefined) {
    return { errors: [`${where}.codexPrefixes: not allowed on allow rules`] };
  }

  const parsed = parseCodexPrefixes(where, codexPrefixes);

  if ('errors' in parsed) {
    return { errors: parsed.errors };
  }

  return { rule: { codexPrefixes: parsed.prefixes, kind: 'shell', shell } };
};

const parseRuleList = (
  list: 'allow' | 'deny',
  value: unknown,
  serverNames: ReadonlySet<string>,
): { readonly errors: string[]; readonly rules: PermissionRule[] } => {
  if (!Array.isArray(value)) {
    return { errors: [`permissions.${list}: must be an array`], rules: [] };
  }

  const results = value.map((entry, index) =>
    parseRule(`permissions.${list}[${index}]`, entry, list, serverNames),
  );

  return {
    errors: results.flatMap((result) => ('errors' in result ? result.errors : [])), // prettier-ignore
    rules: results.flatMap((result) => ('rule' in result ? [result.rule] : [])),
  };
};

/** Validate the parsed source file into a typed model. */
export const parseAgentConfig = (raw: unknown): ParseResult => {
  if (!isObject(raw) || !isObject(raw['mcpServers'])) {
    return { errors: ['mcpServers: must be an object'], ok: false };
  }

  const results = Object.entries(raw['mcpServers'])
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => parseServer(name, value));
  const errors = results.flatMap((result) => ('errors' in result ? result.errors : [])); // prettier-ignore
  const servers = results.flatMap((result) => ('server' in result ? [result.server] : [])); // prettier-ignore

  const serverNames = new Set(Object.keys(raw['mcpServers']));
  const permissions = raw['permissions'];

  if (!isObject(permissions)) {
    return { errors: [...errors, 'permissions: must be an object'], ok: false };
  }

  const allow = parseRuleList('allow', permissions['allow'], serverNames);
  const deny = parseRuleList('deny', permissions['deny'], serverNames);
  const allErrors = [...errors, ...allow.errors, ...deny.errors];

  if (allErrors.length > 0) {
    return { errors: allErrors, ok: false };
  }

  return {
    config: {
      mcpServers: servers,
      permissions: { allow: allow.rules, deny: deny.rules },
    },
    ok: true,
  };
};

// Rendering helpers

const defaultOnServers = (config: AgentConfig): readonly McpServer[] => {
  return config.mcpServers.filter((server) => server.defaultOn);
};

/** Pretty-print JSON (Prettier then normalises it to the repo's style). */
const toJson = (value: unknown): string => {
  return `${JSON.stringify(value, null, 2)}\n`;
};

const claudeServerEntry = (server: McpServer): JsonObject => {
  if (server.transport === 'stdio') {
    return {
      args: [...server.args],
      command: server.command,
      description: server.description,
    };
  }

  return {
    description: server.description,
    type: 'http',
    url: server.url,
  };
};

// Renderers: each returns the file text (pre-Prettier for JSON)

/** `.mcp.json` and `.cursor/mcp.json` (identical, whole file). */
export const renderClaudeMcpJson = (config: AgentConfig): string => {
  const mcpServers: JsonObject = {};

  for (const server of defaultOnServers(config)) {
    mcpServers[server.name] = claudeServerEntry(server);
  }

  return toJson({ mcpServers });
};

const vscodeServerEntry = (server: McpServer): JsonObject => {
  if (server.transport === 'stdio') {
    return { args: [...server.args], command: server.command, type: 'stdio' };
  }

  return { type: 'http', url: server.url };
};

/** `.vscode/mcp.json` (whole file, no descriptions). */
export const renderVscodeMcpJson = (config: AgentConfig): string => {
  const servers: JsonObject = {};

  for (const server of defaultOnServers(config)) {
    servers[server.name] = vscodeServerEntry(server);
  }

  return toJson({ servers });
};

const opencodeServerEntry = (server: McpServer): JsonObject => {
  if (server.transport === 'stdio') {
    return {
      command: [server.command, ...server.args],
      enabled: server.defaultOn,
      type: 'local',
    };
  }

  return { enabled: server.defaultOn, type: 'remote', url: server.url };
};

/** The `mcp` block of `opencode.json` (all servers). */
export const renderOpencodeMcp = (config: AgentConfig): JsonObject => {
  const mcp: JsonObject = {};

  for (const server of config.mcpServers) {
    mcp[server.name] = opencodeServerEntry(server);
  }

  return mcp;
};

/** Replace only the top-level key `key` of an existing JSON file's text. */
export const mergeTopLevelKey = (
  existing: string,
  key: string,
  value: unknown,
): string => {
  const parsed: unknown = JSON.parse(existing);

  if (!isObject(parsed)) {
    throw new Error('expected a JSON object at the top level');
  }

  const merged: JsonObject = { ...parsed };
  merged[key] = value;

  return toJson(merged);
};

const parseJsonObject = (text: string): JsonObject => {
  const parsed: unknown = JSON.parse(text);

  if (!isObject(parsed)) {
    throw new Error('expected a JSON object at the top level');
  }

  return parsed;
};

const objectOrEmpty = (value: unknown): JsonObject => {
  return isObject(value) ? value : {};
};

const globOf = (rule: ShellRule): string => {
  return rule.shell;
};

const shellRules = (rules: readonly PermissionRule[]): readonly ShellRule[] => {
  return rules.flatMap((rule) => (rule.kind === 'shell' ? [rule] : []));
};

/**
 * OpenCode resolves `permission.bash` with last-match-wins, so every allow must
 * come before every deny. Do NOT alphabetize this object.
 */
export const renderOpencodeBash = (config: AgentConfig): JsonObject => {
  const bash: JsonObject = {};

  for (const rule of shellRules(config.permissions.allow)) {
    bash[globOf(rule)] = 'allow';
  }

  for (const rule of shellRules(config.permissions.deny)) {
    bash[globOf(rule)] = 'deny';
  }

  return bash;
};

/** `opencode.json`: only `mcp` and `permission.bash` are generated. */
export const renderOpencodeJson = (
  config: AgentConfig,
  existing: string,
): string => {
  const parsed = parseJsonObject(existing);
  const { bash: _previous, ...otherPermissions } = objectOrEmpty(parsed['permission']); // prettier-ignore
  const merged: JsonObject = { ...parsed };

  merged['mcp'] = renderOpencodeMcp(config);
  merged['permission'] = { bash: renderOpencodeBash(config), ...otherPermissions }; // prettier-ignore

  return toJson(merged);
};

const claudeRule = (rule: PermissionRule): string => {
  return rule.kind === 'shell'
    ? `Bash(${rule.shell})`
    : `mcp__${rule.mcpServer}__*`;
};

/** `.claude/settings.json`: `enabledMcpjsonServers` and `permissions.{allow,deny}`. */
export const renderClaudeSettings = (
  config: AgentConfig,
  existing: string,
): string => {
  const names = defaultOnServers(config).map((server) => server.name);
  const parsed = parseJsonObject(existing);
  const merged: JsonObject = { ...parsed };

  merged['enabledMcpjsonServers'] = names;
  merged['permissions'] = {
    ...objectOrEmpty(parsed['permissions']),
    allow: config.permissions.allow.map(claudeRule),
    deny: config.permissions.deny.map(claudeRule),
  };

  return toJson(merged);
};

/** Cursor splits a shell glob at its first space: `git push*main*` -> `Shell(git:push*main*)`. */
const cursorRule = (rule: PermissionRule): string => {
  if (rule.kind === 'mcpServer') {
    return `Mcp(${rule.mcpServer}:*)`;
  }

  const space = rule.shell.indexOf(' ');

  if (space === -1) {
    return `Shell(${rule.shell})`;
  }

  return `Shell(${rule.shell.slice(0, space)}:${rule.shell.slice(space + 1)})`;
};

/** `.cursor/cli.json`: permissions ONLY; any other key fails cursor-agent's schema. */
export const renderCursorCli = (config: AgentConfig): string => {
  return toJson({
    permissions: {
      allow: config.permissions.allow.map(cursorRule),
      deny: config.permissions.deny.map(cursorRule),
    },
  });
};

/** `.codex/rules/default.rules`: one forbidden prefix_rule per deny codexPrefixes entry. */
export const renderCodexRules = (config: AgentConfig): string => {
  const header = [
    '# GENERATED — DO NOT EDIT',
    `# Source: ${SOURCE_PATH}.`,
    `# Edit that file, then run ${REGENERATE_COMMAND}`,
  ];
  const rules = shellRules(config.permissions.deny).flatMap((rule) =>
    rule.codexPrefixes.map((prefix) => {
      const pattern = prefix.map(tomlString).join(', ');
      const why = tomlString(`${rule.shell} (from ${SOURCE_PATH})`);

      return `prefix_rule(pattern=[${pattern}], decision="forbidden", justification=${why})`;
    }),
  );

  return `${[header.join('\n'), ...rules].join('\n\n')}\n`;
};

/** Errors when `.claude/settings.json` does not switch agent attribution off. */
export const checkClaudeAttribution = (settings: string): string[] => {
  const attribution = objectOrEmpty(parseJsonObject(settings)['attribution']);
  const errors: string[] = [];

  for (const key of ['commit', 'pr']) {
    if (attribution[key] !== '') {
      errors.push(`.claude/settings.json: attribution.${key} must be "" (agent attribution off)`); // prettier-ignore
    }
  }

  return errors;
};

const wrapComment = (text: string, width: number): string[] => {
  const lines: string[] = [];

  for (const word of text.split(/\s+/)) {
    const last = lines.at(-1);

    if (last !== undefined && `${last} ${word}`.length <= width) {
      lines[lines.length - 1] = `${last} ${word}`;
    } else {
      lines.push(word);
    }
  }

  return lines.map((line) => `# ${line}`);
};

const TOML_BARE_KEY = /^[A-Za-z0-9_-]+$/;

const tomlKey = (name: string): string => {
  return TOML_BARE_KEY.test(name) ? name : JSON.stringify(name);
};

const tomlString = (value: string): string => {
  return JSON.stringify(value);
};

const renderCodexServer = (server: McpServer): string[] => {
  const table = `[mcp_servers.${tomlKey(server.name)}]`;
  const comment = wrapComment(server.description, 100);

  if (server.transport === 'stdio') {
    const args = server.args.map(tomlString).join(', ');

    return [
      ...comment,
      table,
      `command = ${tomlString(server.command)}`,
      `args = [${args}]`,
      `enabled = ${String(server.defaultOn)}`,
    ];
  }

  return [
    ...comment,
    table,
    `url = ${tomlString(server.url)}`,
    `enabled = ${String(server.defaultOn)}`,
  ];
};

/** `.codex/config.toml` (whole file, all servers). */
export const renderCodexConfig = (config: AgentConfig): string => {
  const header = [
    '# GENERATED — DO NOT EDIT',
    `# Source: ${SOURCE_PATH}.`,
    `# Edit that file, then run ${REGENERATE_COMMAND}`,
    '# Servers with enabled = false are defined but off by default.',
  ];
  const attribution = [
    '# Agent attribution off (AGENTS.md § No agent attribution).',
    'commit_attribution = ""',
  ];
  const blocks = config.mcpServers.map((server) =>
    renderCodexServer(server).join('\n'),
  );

  return `${[header.join('\n'), attribution.join('\n'), ...blocks].join('\n\n')}\n`;
};

// Output registry

/** One file this generator owns. `render` gets the file's current text ('' if absent). */
export interface AgentConfigOutput {
  readonly path: string;
  readonly render: (config: AgentConfig, existing: string) => string;
}

export const OUTPUTS: readonly AgentConfigOutput[] = [
  { path: '.claude/settings.json', render: renderClaudeSettings },
  { path: '.codex/config.toml', render: renderCodexConfig },
  { path: '.codex/rules/default.rules', render: renderCodexRules },
  { path: '.cursor/cli.json', render: renderCursorCli },
  { path: '.cursor/mcp.json', render: renderClaudeMcpJson },
  { path: '.mcp.json', render: renderClaudeMcpJson },
  { path: '.vscode/mcp.json', render: renderVscodeMcpJson },
  { path: 'opencode.json', render: renderOpencodeJson },
];

// IO

const readIfExists = (path: string): string => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
};

const formatOutput = async (path: string, text: string): Promise<string> => {
  if (!path.endsWith('.json')) {
    return text;
  }

  const config = await prettier.resolveConfig(path);

  return prettier.format(text, { ...config, filepath: path });
};

const readSource = (cwd: string): unknown => {
  try {
    return JSON.parse(readFileSync(join(cwd, SOURCE_PATH), 'utf8'));
  } catch {
    return undefined;
  }
};

/** Compute every output's expected text from the source file. */
export const computeOutputs = async (
  cwd: string,
): Promise<
  | {
      readonly files: readonly {
        readonly expected: string;
        readonly path: string;
      }[];
      readonly ok: true;
    }
  | { readonly errors: readonly string[]; readonly ok: false }
> => {
  const parsed = parseAgentConfig(readSource(cwd));

  if (!parsed.ok) {
    return { errors: parsed.errors, ok: false };
  }

  const attributionErrors = checkClaudeAttribution(readIfExists(join(cwd, '.claude/settings.json')) || '{}'); // prettier-ignore

  if (attributionErrors.length > 0) {
    return { errors: attributionErrors, ok: false };
  }

  const files = await Promise.all(
    OUTPUTS.map(async (output) => {
      const absolute = join(cwd, output.path);
      const text = output.render(parsed.config, readIfExists(absolute));

      return {
        expected: await formatOutput(absolute, text),
        path: output.path,
      };
    }),
  );

  return { files, ok: true };
};

const printDiff = (cwd: string, path: string, expected: string): void => {
  const dir = mkdtempSync(join(tmpdir(), 'ot-agent-config-'));
  const expectedPath = join(dir, 'expected');

  try {
    writeFileSync(expectedPath, expected);
    const result = run('diff', ['-u', join(cwd, path), expectedPath], {
      allowFailure: true,
      cwd,
    });
    logger.info(result.stdout);
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
};

export const main = async (
  cwd: string = process.cwd(),
  argv: readonly string[] = process.argv.slice(2),
): Promise<number> => {
  const computed = await computeOutputs(cwd);

  if (!computed.ok) {
    logger.fail('Invalid agent config source:');
    for (const error of computed.errors) {
      logger.info(`  ${error}`);
    }

    return 1;
  }

  const drifted = computed.files.filter(
    (file) => readIfExists(join(cwd, file.path)) !== file.expected,
  );

  if (hasFlag('check', [...argv])) {
    if (drifted.length === 0) {
      logger.success(`Agent config: ${computed.files.length} generated file(s) match ${SOURCE_PATH}`); // prettier-ignore

      return 0;
    }

    for (const file of drifted) {
      logger.fail(`${file.path} drifted from ${SOURCE_PATH}`);
      printDiff(cwd, file.path, file.expected);
    }

    logger.info(`Edit ${SOURCE_PATH} (never the generated file), then run ${REGENERATE_COMMAND}`); // prettier-ignore

    return 1;
  }

  for (const file of drifted) {
    const absolute = join(cwd, file.path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, file.expected);
    logger.info(`wrote ${file.path}`);
  }

  logger.success(`Agent config: ${drifted.length} of ${computed.files.length} file(s) changed`); // prettier-ignore

  return 0;
};

if (process.argv[1]?.endsWith('sync-agent-config.ts')) {
  process.exit(await main());
}
