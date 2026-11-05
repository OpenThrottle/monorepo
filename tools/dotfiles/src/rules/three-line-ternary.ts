import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

/**
 * The three-line-ternary rule: a ternary takes at most three lines
 * (docs/monorepo/code-style.md, "A ternary takes at most three lines").
 *
 * A ternary may stay on one line, or wrap into exactly the three-line shape
 * Prettier prints when its condition stays on the line that introduces it:
 *
 *     const label = hasResetTime
 *       ? knownResetLabel
 *       : resetUnknown;
 *
 * It reports two shapes:
 *
 * - `tooManyLines` — a `ConditionalExpression` spanning more than three lines:
 *   a wrapped chain, or a branch (usually a JSX subtree) that itself wraps.
 * - `wrappedCondition` — a wrapped ternary whose condition was pushed below the
 *   `=`, `:` or `=>` that introduces it. Prettier does this whenever the
 *   condition is a binary expression (`a === b`, `a && b`), which makes the
 *   statement four lines; naming the condition keeps it on the `=` line.
 *
 * JSX conditionals are in scope by decision. Core `multiline-ternary` is not
 * used because it fights Prettier, which wraps on width.
 *
 * There is no autofix: the fix is a human naming the condition or the branches,
 * extracting a util, or switching to `if`/`else`.
 *
 * A chained ternary is reported once, on its outermost reported link, so a
 * five-line `a ? b : c ? d : e` is one warning, not two.
 */

type MessageIds = 'tooManyLines' | 'wrappedCondition';

const MAX_LINES = 3;

/**
 * Parents that introduce their value with an operator (`=`, `:`, `=>`, `+=`, …)
 * a wrapped ternary's condition must stay on the line of.
 */
const INTRODUCING_PARENTS: ReadonlySet<AST_NODE_TYPES> = new Set([
  AST_NODE_TYPES.ArrowFunctionExpression,
  AST_NODE_TYPES.AssignmentExpression,
  AST_NODE_TYPES.AssignmentPattern,
  AST_NODE_TYPES.Property,
  AST_NODE_TYPES.PropertyDefinition,
  AST_NODE_TYPES.VariableDeclarator,
]);

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

/**
 * @description The number of source lines the node spans.
 */
const lineCount = (node: TSESTree.Node): number => {
  return node.loc.end.line - node.loc.start.line + 1;
};

/**
 * @description Which report, if any, the ternary earns.
 */
const violationOf = (
  node: TSESTree.ConditionalExpression,
  sourceCode: Readonly<TSESLint.SourceCode>,
): MessageIds | undefined => {
  if (lineCount(node) === 1) return undefined;
  if (lineCount(node) > MAX_LINES) return 'tooManyLines';

  const introducer = sourceCode.getTokenBefore(node);
  if (introducer === null) return undefined;

  const isIntroduced = INTRODUCING_PARENTS.has(node.parent.type);
  const isPushedDown = introducer.loc.end.line < node.loc.start.line;
  if (isIntroduced && isPushedDown) return 'wrappedCondition';

  return undefined;
};

export const threeLineTernary = createRule<[], MessageIds>({
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      ConditionalExpression(node): void {
        const violation = violationOf(node, sourceCode);
        if (violation === undefined) return;

        const parent = node.parent;
        const isChainLink =
          parent.type === AST_NODE_TYPES.ConditionalExpression;
        if (isChainLink && violationOf(parent, sourceCode) !== undefined) {
          return;
        }

        context.report({ messageId: violation, node });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Require a ternary to take at most three lines, with its condition on the line that introduces it.`,
    },
    messages: {
      tooManyLines: `A ternary takes at most three lines — condition, \`? …\`, \`: …\`. Name the branches in consts (JSX branches under \`// Markup\`), extract a well-named util, or use if/else.`,
      wrappedCondition: `This ternary's condition wrapped below its \`=\`, making it four lines. Name the condition (\`const isX = …\`) so the ternary starts on the \`=\` line.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'three-line-ternary',
});
