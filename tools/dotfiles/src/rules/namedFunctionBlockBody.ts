import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

/**
 * The named-function-block-body rule: a function bound to a name has a block
 * body (docs/monorepo/code-style.md, "Named functions use block bodies").
 *
 * Reports an arrow function with a concise expression body when its parent is
 * a `VariableDeclarator` (`const f = (x) => x;`) or a class
 * `PropertyDefinition` (`handle = () => this.x;`). Everything else — a callback
 * passed as an argument, a JSX attribute, an object-literal method — is an
 * inline function and exempt, which is why this is not core `arrow-body-style`.
 *
 * The autofix rewrites `=> expr` to `=> { return expr; }`, dropping the
 * parentheses around an object-literal body; Prettier then expands the block
 * onto its own lines. It declines to fix when a comment
 * sits between the arrow and the body, so no comment is ever lost.
 */

type MessageIds = 'conciseBody';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

const NAMED_PARENTS: ReadonlySet<string> = new Set([
  AST_NODE_TYPES.PropertyDefinition,
  AST_NODE_TYPES.VariableDeclarator,
]);

/**
 * @description Whether the text around the body, between `=>` and the arrow's
 * end, is nothing but wrapping parentheses and whitespace.
 */
const isOnlyParens = (text: string): boolean => {
  return /^[\s()]*$/.test(text);
};

/**
 * @description A sequence expression keeps its parentheses —
 * `return (a, b);` reads as one value, `return a, b;` does not.
 */
const needsParens = (body: TSESTree.Expression): boolean => {
  return body.type === AST_NODE_TYPES.SequenceExpression;
};

export const namedFunctionBlockBody = createRule<[], MessageIds>({
  create(context) {
    const sourceCode = context.sourceCode;

    const buildFix = (
      node: TSESTree.ArrowFunctionExpression,
      body: TSESTree.Expression,
    ): TSESLint.ReportFixFunction | null => {
      const arrow = sourceCode.getTokenBefore(body, {
        filter: (token) => token.value === '=>',
      });
      if (arrow === null) return null;

      const before = sourceCode.text.slice(arrow.range[1], body.range[0]);
      const after = sourceCode.text.slice(body.range[1], node.range[1]);
      if (!isOnlyParens(before) || !isOnlyParens(after)) return null;

      const bodyText = sourceCode.getText(body);
      const returned = needsParens(body) ? `(${bodyText})` : bodyText;

      return (fixer) => {
        return fixer.replaceTextRange(
          [arrow.range[1], node.range[1]],
          ` { return ${returned}; }`,
        );
      };
    };

    return {
      ArrowFunctionExpression(node): void {
        if (node.body.type === AST_NODE_TYPES.BlockStatement) return;
        if (!NAMED_PARENTS.has(node.parent.type)) return;

        context.report({
          fix: buildFix(node, node.body),
          messageId: 'conciseBody',
          node: node.body,
        });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Require a block body on arrow functions bound to a name (a const or a class property).`,
    },
    fixable: 'code',
    messages: {
      conciseBody: `A named function uses a block body: write \`=> { return …; }\`, not a concise \`=> expr\`. Inline callbacks are exempt.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'named-function-block-body',
});
