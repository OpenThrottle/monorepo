import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

import { matchesAnyPath } from './matchesAnyPath.ts';

/**
 * The prefer-nodejs-utils rule: the small universal helpers live in
 * `@openthrottle/nodejs-utils`, so a file imports them instead of declaring
 * its own copy. It flags two things:
 *
 * - a function declared under one of the helpers' names (or a name an old
 *   copy went by, such as `describeError` or `isErrnoException`), and
 * - the inline `error instanceof Error ? error.message : String(error)`
 *   ternary, which is `toErrorMessage(error)`.
 *
 * A guard that deliberately differs (one that lets arrays through, or checks
 * the prototype) takes a name that says so and is not flagged. Paths in the
 * `allow` option are exempt: the package itself, the projects it depends on,
 * and scripts that must run before `pnpm install`.
 */

type MessageIds = 'inlineErrorMessage' | 'localCopy';

const createRule = ESLintUtils.RuleCreator(
  () =>
    'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#shared-helpers-come-from-nodejs-utils',
);

interface RuleOptions {
  /**
   * Path suffixes (or `dir/` prefixes) exempt from the rule; see
   * {@link matchesAnyPath}.
   */
  readonly allow: readonly string[];
}

/**
 * @description Local name → the `@openthrottle/nodejs-utils` export that
 * replaces it: the helpers' own names plus the names their deleted copies
 * went by. `isPlainRecord` is absent on purpose (nestjs-profiling's prototype
 * check differs), and so is `delay`, which is too generic to flag.
 */
const REPLACEMENTS: Readonly<Record<string, string>> = {
  describeError: 'toErrorMessage',
  errorMessage: 'toErrorMessage',
  isErrnoException: 'isErrorWithCode',
  isErrorWithCode: 'isErrorWithCode',
  isMutableRecord: 'isRecord',
  isNodeErrno: 'isErrorWithCode',
  isPropertyRecord: 'isRecord',
  isRecord: 'isRecord',
  isRecordValue: 'isRecord',
  isStringArray: 'isStringArray',
  sleep: 'sleep',
  sleepMs: 'sleep',
  toErrorMessage: 'toErrorMessage',
};

/** @description The replacing export for a declared name, if it has one. */
const replacementFor = (name: string): string | undefined => {
  return Object.hasOwn(REPLACEMENTS, name) ? REPLACEMENTS[name] : undefined;
};

/** @description Whether `node` declares a function value. */
const isFunctionInit = (node: TSESTree.Expression | null): boolean => {
  return (
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'FunctionExpression'
  );
};

export const preferNodejsUtils = createRule<[RuleOptions], MessageIds>({
  create(context, [{ allow }]) {
    if (matchesAnyPath(context.filename, allow)) return {};

    const { sourceCode } = context;

    const reportCopy = (node: TSESTree.Identifier): void => {
      const replacement = replacementFor(node.name);
      if (replacement === undefined) return;
      context.report({
        data: { name: node.name, replacement },
        messageId: 'localCopy',
        node,
      });
    };

    return {
      ConditionalExpression(node): void {
        const { alternate, consequent, test } = node;
        const isInstanceofError =
          test.type === 'BinaryExpression' &&
          test.operator === 'instanceof' &&
          test.right.type === 'Identifier' &&
          test.right.name === 'Error';
        if (!isInstanceofError) return;

        const subject = sourceCode.getText(test.left);
        const isMessage =
          consequent.type === 'MemberExpression' &&
          !consequent.computed &&
          consequent.property.type === 'Identifier' &&
          consequent.property.name === 'message' &&
          sourceCode.getText(consequent.object) === subject;
        const isStringCall =
          alternate.type === 'CallExpression' &&
          alternate.callee.type === 'Identifier' &&
          alternate.callee.name === 'String' &&
          alternate.arguments.length === 1 &&
          sourceCode.getText(alternate.arguments[0]) === subject;
        if (!isMessage || !isStringCall) return;

        context.report({
          data: { subject },
          messageId: 'inlineErrorMessage',
          node,
        });
      },
      FunctionDeclaration(node): void {
        if (node.id !== null) reportCopy(node.id);
      },
      VariableDeclarator(node): void {
        if (node.id.type === 'Identifier' && isFunctionInit(node.init)) {
          reportCopy(node.id);
        }
      },
    };
  },
  defaultOptions: [{ allow: [] }],
  meta: {
    docs: {
      description: `Import the shared helpers from @openthrottle/nodejs-utils instead of declaring local copies.`,
    },
    messages: {
      inlineErrorMessage: `Use \`toErrorMessage({{subject}})\` from @openthrottle/nodejs-utils instead of the inline instanceof-Error ternary.`,
      localCopy: `\`{{name}}\` duplicates \`{{replacement}}\` in @openthrottle/nodejs-utils: import it instead. A guard that deliberately differs takes a name that says how.`,
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          allow: { items: { type: 'string' }, type: 'array' },
        },
        type: 'object',
      },
    ],
    type: 'suggestion',
  },
  name: 'prefer-nodejs-utils',
});
