import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils';

/**
 * The long-string-template-literal rule: long strings are template literals
 * (docs/monorepo/code-style.md, "Long strings are template literals").
 *
 * Reports a quoted string that Prettier moved onto its own line below the
 * thing that names it — an object property key, a class property key, or a
 * `const x =` declarator. Prettier never breaks after the operator before a
 * template literal, so the backtick form stays on the key's line.
 *
 * Call arguments are deliberately out of scope: Prettier puts every argument
 * on its own line once a call outgrows the print width, so a string alone on
 * its line there is not the signal, and a template literal does not change
 * the layout.
 *
 * The autofix rewrites the literal as a template literal and pulls it up onto
 * the key's line. It is skipped when a comment sits between the two, or when
 * the string carries a legacy octal escape (illegal in a template literal).
 */

type MessageIds = 'useTemplateLiteral';

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#${name}`,
);

/**
 * @description Whether the literal is the value of a property key or the
 * initializer of a declarator — the positions Prettier breaks after.
 */
const isOwnedValue = (node: TSESTree.Literal): boolean => {
  const parent = node.parent;
  if (parent.type === AST_NODE_TYPES.Property) return parent.value === node;
  if (parent.type === AST_NODE_TYPES.PropertyDefinition) {
    return parent.value === node;
  }
  if (parent.type === AST_NODE_TYPES.VariableDeclarator) {
    return parent.init === node;
  }
  return false;
};

/**
 * @description Whether the raw string has an escape a template literal
 * rejects (`\1`–`\7`, or `\0` followed by a digit).
 */
const hasLegacyOctalEscape = (raw: string): boolean => {
  return /(?<!\\)(?:\\\\)*\\(?:[1-7]|0\d)/.test(raw);
};

/**
 * @description The template-literal spelling of a quoted string's raw text:
 * the quote escape is dropped, and backticks and `${` are escaped.
 */
const toTemplateLiteral = (raw: string): string => {
  const quote = raw.charAt(0);
  const body = raw
    .slice(1, -1)
    .replace(
      /(?<!\\)((?:\\\\)*)\\(['"])/g,
      (match: string, slashes: string, q: string) => {
        return q === quote ? `${slashes}${q}` : match;
      },
    )
    .replace(/(?<!\\)((?:\\\\)*)`/g, '$1\\`')
    .replace(/(?<!\\)((?:\\\\)*)\$\{/g, '$1\\${');
  return `\`${body}\``;
};

export const longStringTemplateLiteral = createRule<[], MessageIds>({
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Literal(node): void {
        if (typeof node.value !== 'string') return;
        if (!isOwnedValue(node)) return;

        const operator = sourceCode.getTokenBefore(node);
        if (operator === null) return;
        if (node.loc.start.line === operator.loc.end.line) return;

        const hasComment = sourceCode.commentsExistBetween(operator, node);
        const canFix = !hasComment && !hasLegacyOctalEscape(node.raw);

        const fix = (fixer: TSESLint.RuleFixer): TSESLint.RuleFix => {
          return fixer.replaceTextRange(
            [operator.range[1], node.range[1]],
            ` ${toTemplateLiteral(node.raw)}`,
          );
        };

        context.report({
          fix: canFix ? fix : null,
          messageId: 'useTemplateLiteral',
          node,
        });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Require a string Prettier wrapped below its key to be a template literal, which stays on the key line.`,
    },
    fixable: 'code',
    messages: {
      useTemplateLiteral: `Long strings are template literals. Write this value in backticks so Prettier keeps it on the key's line.`,
    },
    schema: [],
    type: 'suggestion',
  },
  name: 'long-string-template-literal',
});
