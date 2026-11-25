import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * The file-header-first rule: a file-level `/** … *\/` header comes before the
 * first import, never after it.
 *
 * A codemod that prepends an import (`import { x } from 'pkg';`) to a file
 * that opens with a header pushes the header down between two imports, where
 * it documents nothing. `simple-import-sort` cannot see it, because it sorts
 * the imports and leaves comments where they are. The shape is unambiguous: a
 * JSDoc block whose next token is another import belongs to no declaration,
 * so it was the file's header. The fix moves it back above the first import.
 */

type MessageIds = 'headerBelowImport';

const createRule = ESLintUtils.RuleCreator(
  () =>
    'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#file-header-comes-first',
);

/**
 * @description The first JSDoc block (`/** … *\/`) that sits between two
 * imports at the head of the file, or `undefined` when there is none.
 */
const findHoistedHeader = (
  body: readonly TSESTree.ProgramStatement[],
  comments: readonly TSESTree.Comment[],
): TSESTree.BlockComment | undefined => {
  const first = body[0];
  if (first?.type !== 'ImportDeclaration') return undefined;

  for (const comment of comments) {
    if (comment.type !== 'Block' || !comment.value.startsWith('*')) continue;
    if (comment.range[0] < first.range[1]) continue;

    const next = body.find((statement) => {
      return statement.range[0] > comment.range[1];
    });
    if (next?.type !== 'ImportDeclaration') return undefined;

    const between = body.some((statement) => {
      return (
        statement.type !== 'ImportDeclaration' &&
        statement.range[0] < comment.range[0]
      );
    });
    return between ? undefined : comment;
  }

  return undefined;
};

export const fileHeaderFirst = createRule<[], MessageIds>({
  create(context) {
    const { sourceCode } = context;

    return {
      Program(program): void {
        const header = findHoistedHeader(
          program.body,
          sourceCode.getAllComments(),
        );
        const first = program.body[0];
        if (header === undefined || first === undefined) return;

        context.report({
          fix: (fixer) => {
            const text = sourceCode.getText(header);
            const afterHeader = sourceCode.text.slice(header.range[1]);
            const trailing = /^[^\S\n]*\n?/.exec(afterHeader)?.[0] ?? '';
            return [
              fixer.removeRange([
                header.range[0],
                header.range[1] + trailing.length,
              ]),
              fixer.insertTextBefore(first, `${text}\n\n`),
            ];
          },
          loc: header.loc,
          messageId: 'headerBelowImport',
        });
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description: `Keep a file-level JSDoc header above the first import.`,
    },
    fixable: 'code',
    messages: {
      headerBelowImport: `This file header sits below an import, where it documents nothing. Move it above the first import (\`eslint --fix\` does).`,
    },
    schema: [],
    type: 'layout',
  },
  name: 'file-header-first',
});
