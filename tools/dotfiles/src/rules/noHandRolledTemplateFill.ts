import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

/**
 * @description The no-hand-rolled-template-fill rule: a copy template's `{token}`
 * placeholders are filled with `fillTemplate`, not by chaining
 * `.replace('{token}', value)` (docs/monorepo/code-style.md, "Fill copy
 * templates with `fillTemplate`").
 *
 * It reports a `.replace` / `.replaceAll` call whose first argument is a
 * string literal that is exactly a `{identifier}` placeholder. A regex first
 * argument, or a string that is not a bare placeholder, is not a template fill
 * and is left alone. There is no autofix: a chain becomes one `fillTemplate`
 * call whose values object names every token.
 */

type MessageIds = 'handRolledFill';

const PLACEHOLDER = /^\{[A-Za-z_$][\w$]*\}$/;
const REPLACERS: ReadonlySet<string> = new Set(['replace', 'replaceAll']);

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

/**
 * @description The method name of a non-computed `x.name(...)` call.
 */
const methodNameOf = (node: TSESTree.CallExpression): string | undefined => {
  const callee = node.callee;
  if (callee.type !== AST_NODE_TYPES.MemberExpression) return undefined;
  if (callee.computed) return undefined;
  if (callee.property.type !== AST_NODE_TYPES.Identifier) return undefined;

  return callee.property.name;
};

export const noHandRolledTemplateFill = createRule<[], MessageIds>({
  create(context) {
    return {
      CallExpression(node): void {
        const method = methodNameOf(node);
        if (method === undefined || !REPLACERS.has(method)) return;

        const first = node.arguments[0];
        if (first === undefined) return;
        if (first.type !== AST_NODE_TYPES.Literal) return;
        if (typeof first.value !== 'string') return;
        if (!PLACEHOLDER.test(first.value)) return;

        context.report({ messageId: 'handRolledFill', node });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Require copy templates to be filled with fillTemplate, not hand-rolled .replace('{token}', …) calls.`,
    },
    messages: {
      handRolledFill: `Fill a \`{token}\` template with \`fillTemplate(template, { token: value })\`, not \`.replace('{token}', …)\`. One call names every token; a chain silently skips one.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'no-hand-rolled-template-fill',
});
