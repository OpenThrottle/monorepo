import type { TSESTree } from '@typescript-eslint/utils';

import {
  createAgentSafetyRule,
  matchesAnyPath,
} from './agent-safety-shared.ts';

/**
 * The mcp-tool-registration rule: an MCP tool is exposed only through the
 * canonical registry in `@openthrottle/openthrottle-mcp`.
 *
 * `src/tool-registry.ts` is the single list every transport registers from
 * (`defineTool` → `server.registerTool`), and `src/nest/openthrottle-mcp-mcp-
 * surface.ts` is the Nest mirror a parity test pins to that list. Every
 * handler there calls the OpenThrottle GraphQL API with the caller's token, so
 * the server's auth guards decide what the tool may touch. A tool registered
 * anywhere else skips the parity test and can reach data without that check.
 *
 * Flags, outside the allowed files:
 * - `<server>.registerTool(...)`
 * - the deprecated `<server>.tool('name', ...)` form (a string-literal first
 *   argument tells it apart from unrelated `.tool()` methods)
 * - a `@Tool(...)` decorator imported from `@rekog/mcp-nest`
 */

type MessageIds = 'decorator' | 'registerTool';

interface RuleOptions {
  /**
   * Path suffixes (or `dir/` prefixes) allowed to register tools; see
   * {@link matchesAnyPath}.
   */
  readonly allowedFiles: readonly string[];
}

const DEFAULT_ALLOWED_FILES: readonly string[] = [
  'openthrottle-mcp/src/nest/openthrottle-mcp-mcp-surface.ts',
  'openthrottle-mcp/src/tool-registry.ts',
];

const NEST_MCP_MODULE = '@rekog/mcp-nest';

/**
 * @description The method name of `node`'s callee when it is a non-computed
 * member call, else `null`.
 */
const memberCallName = (node: TSESTree.CallExpression): string | null => {
  const { callee } = node;
  if (
    callee.type !== 'MemberExpression' ||
    callee.computed ||
    callee.property.type !== 'Identifier'
  ) {
    return null;
  }
  return callee.property.name;
};

export const mcpToolRegistration = createAgentSafetyRule<
  [RuleOptions],
  MessageIds
>({
  create(context, [options]) {
    if (matchesAnyPath(context.filename, options.allowedFiles)) return {};

    const toolDecoratorNames = new Set<string>();

    return {
      CallExpression(node): void {
        const name = memberCallName(node);
        const first = node.arguments[0];
        const isLegacyTool =
          name === 'tool' &&
          first !== undefined &&
          ((first.type === 'Literal' && typeof first.value === 'string') ||
            first.type === 'TemplateLiteral');
        if (name === 'registerTool' || isLegacyTool) {
          context.report({ messageId: 'registerTool', node });
        }
      },
      Decorator(node): void {
        const decorated = node.expression;
        const isCall = decorated.type === 'CallExpression';
        const expression = isCall ? decorated.callee : decorated;
        if (
          expression.type === 'Identifier' &&
          toolDecoratorNames.has(expression.name)
        ) {
          context.report({ messageId: 'decorator', node });
        }
      },
      ImportDeclaration(node): void {
        if (node.source.value !== NEST_MCP_MODULE) return;
        for (const specifier of node.specifiers) {
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.imported.type === 'Identifier' &&
            specifier.imported.name === 'Tool'
          ) {
            toolDecoratorNames.add(specifier.local.name);
          }
        }
      },
    };
  },
  defaultOptions: [{ allowedFiles: DEFAULT_ALLOWED_FILES }],
  meta: {
    docs: {
      description: `Register MCP tools only through the openthrottle-mcp tool registry.`,
    },
    messages: {
      decorator: `Declare MCP tools on the Nest surface in openthrottle-mcp (src/nest/openthrottle-mcp-mcp-surface.ts), mirrored from src/tool-registry.ts. A \`@Tool\` elsewhere skips the registry parity test and the token-checked GraphQL path.`,
      registerTool: `Register MCP tools only through \`defineTool\` in openthrottle-mcp src/tool-registry.ts. A tool registered elsewhere skips the registry parity test and the token-checked GraphQL path.`,
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
  name: 'mcp-tool-registration',
});
