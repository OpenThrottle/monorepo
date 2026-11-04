import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

import {
  createAgentSafetyRule,
  matchesAnyPath,
} from './agent-safety-shared.ts';

/**
 * The agent-cli-spawn-chokepoint rule: an agent CLI (Claude Code, Codex,
 * Cursor, Gemini, Grok, OpenCode, Antigravity) is launched only from
 * `@openthrottle/openthrottle-drivers` or the conversation backends in
 * `@openthrottle/openthrottle-agentic-utils`.
 *
 * Those two are where the spawn hardening lives — allowlisted binary via a
 * bin-env override, scrubbed environment, argv array with no shell, idle and
 * wall-clock timeouts, SIGTERM→SIGKILL teardown. A third spawn site gets none
 * of it, and an agent process with an unscrubbed env and no timeout is the
 * failure this guards against.
 *
 * Syntactic, so it sees only a binary named in the file: a string or template
 * literal, a same-file `const` bound to one, or the first word of a shell
 * string (`exec('claude -p …')`). A binary resolved at runtime is invisible
 * to it; the allowed packages are the only ones that do that today.
 */

type MessageIds = 'agentCliSpawn';

interface RuleOptions {
  /**
   * Path suffixes (or `dir/` prefixes) allowed to spawn agent CLIs; see
   * {@link matchesAnyPath}.
   */
  readonly allowedFiles: readonly string[];
}

const DEFAULT_ALLOWED_FILES: readonly string[] = [
  'openthrottle-agentic-utils/src/utils/conversation-backend/',
  'openthrottle-drivers/src/',
];

/**
 * The `binary` of every driver in openthrottle-drivers (`src/drivers/*.ts`),
 * plus the long name Antigravity also installs under. Duplicated rather than
 * imported: every project's lint config loads this package, so it cannot
 * depend on a workspace package.
 */
const AGENT_CLI_BINARIES: ReadonlySet<string> = new Set([
  'agy',
  'antigravity',
  'claude',
  'codex',
  'cursor-agent',
  'gemini',
  'grok',
  'opencode',
]);

/** Module → the exports that start a process. `default` is a default import. */
const SPAWN_EXPORTS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  [
    'child_process',
    new Set([
      'exec',
      'execFile',
      'execFileSync',
      'execSync',
      'fork',
      'spawn',
      'spawnSync',
    ]),
  ],
  ['cross-spawn', new Set(['default', 'spawn', 'sync'])],
  [
    'execa',
    new Set([
      '$',
      'execa',
      'execaCommand',
      'execaCommandSync',
      'execaNode',
      'execaSync',
    ]),
  ],
]);

const MAX_RESOLVE_DEPTH = 4;

const normalizeModule = (source: string): string =>
  source.startsWith('node:') ? source.slice('node:'.length) : source;

/**
 * @description The statically known leading text of `node`: a string
 * literal, the head of a template literal, or a `const` initialised with
 * either. `null` when it cannot be known without running the code.
 */
const staticText = (
  node: TSESTree.Node,
  scope: TSESLint.Scope.Scope,
  depth: number,
): string | null => {
  if (depth > MAX_RESOLVE_DEPTH) return null;
  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === 'TemplateLiteral') {
    return node.quasis[0]?.value.cooked ?? null;
  }
  if (node.type !== 'Identifier') return null;

  let current: TSESLint.Scope.Scope | null = scope;
  while (current !== null) {
    const variable = current.set.get(node.name);
    if (variable !== undefined) {
      const definition = variable.defs[0];
      if (
        definition?.type !== 'Variable' ||
        definition.parent.kind !== 'const' ||
        definition.node.init === null
      ) {
        return null;
      }
      return staticText(definition.node.init, current, depth + 1);
    }
    current = current.upper;
  }
  return null;
};

/** @description The executable a command string names, without its path. */
const binaryName = (text: string): string => {
  const firstWord = text.trim().split(/\s+/)[0] ?? '';
  return firstWord.slice(firstWord.lastIndexOf('/') + 1);
};

export const agentCliSpawnChokepoint = createAgentSafetyRule<
  [RuleOptions],
  MessageIds
>({
  create(context, [options]) {
    if (matchesAnyPath(context.filename, options.allowedFiles)) return {};

    /** Local names bound to a spawning function. */
    const spawnFunctions = new Set<string>();
    /** Local names bound to a whole spawning module (`import * as cp`). */
    const spawnNamespaces = new Map<string, ReadonlySet<string>>();

    const isSpawnCallee = (callee: TSESTree.Node): boolean => {
      if (callee.type === 'Identifier') return spawnFunctions.has(callee.name);
      if (
        callee.type === 'MemberExpression' &&
        !callee.computed &&
        callee.object.type === 'Identifier' &&
        callee.property.type === 'Identifier'
      ) {
        const exported = spawnNamespaces.get(callee.object.name);
        return exported?.has(callee.property.name) ?? false;
      }
      return false;
    };

    const checkCommand = (
      call: TSESTree.CallExpression | TSESTree.TaggedTemplateExpression,
      command: TSESTree.Node | undefined,
    ): void => {
      if (command === undefined) return;
      const text = staticText(command, context.sourceCode.getScope(command), 0);
      if (text === null) return;
      const binary = binaryName(text);
      if (!AGENT_CLI_BINARIES.has(binary)) return;
      context.report({
        data: { binary },
        messageId: 'agentCliSpawn',
        node: call,
      });
    };

    return {
      CallExpression(node): void {
        if (isSpawnCallee(node.callee)) {
          checkCommand(node, node.arguments[0]);
          return;
        }
        // `const run = promisify(execFile)` makes `run` a spawner too.
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'promisify' &&
          node.parent.type === 'VariableDeclarator' &&
          node.parent.id.type === 'Identifier'
        ) {
          const wrapped = node.arguments[0];
          if (wrapped !== undefined && isSpawnCallee(wrapped)) {
            spawnFunctions.add(node.parent.id.name);
          }
        }
      },
      ImportDeclaration(node): void {
        const exported = SPAWN_EXPORTS.get(normalizeModule(node.source.value));
        if (exported === undefined) return;
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportNamespaceSpecifier') {
            spawnNamespaces.set(specifier.local.name, exported);
          } else if (specifier.type === 'ImportDefaultSpecifier') {
            if (exported.has('default')) {
              spawnFunctions.add(specifier.local.name);
            } else {
              spawnNamespaces.set(specifier.local.name, exported);
            }
          } else if (
            specifier.imported.type === 'Identifier' &&
            exported.has(specifier.imported.name)
          ) {
            spawnFunctions.add(specifier.local.name);
          }
        }
      },
      TaggedTemplateExpression(node): void {
        // execa's `$\`claude -p …\``.
        if (isSpawnCallee(node.tag)) checkCommand(node, node.quasi);
      },
    };
  },
  defaultOptions: [{ allowedFiles: DEFAULT_ALLOWED_FILES }],
  meta: {
    docs: {
      description:
        'Spawn agent CLIs only through openthrottle-drivers or the agentic-utils conversation backends.',
    },
    messages: {
      agentCliSpawn:
        'Do not spawn `{{binary}}` directly. Agent CLIs launch through `@openthrottle/openthrottle-drivers` (`runDriverSync` / `runDriverAsync`) or an `@openthrottle/openthrottle-agentic-utils` conversation backend, which scrub the env, pin the binary, and enforce timeouts and teardown.',
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          allowedFiles: { items: { type: 'string' }, type: 'array' },
        },
        type: 'object',
      },
    ],
    type: 'problem',
  },
  name: 'agent-cli-spawn-chokepoint',
});
