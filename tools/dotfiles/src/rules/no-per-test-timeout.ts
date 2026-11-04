import type { TSESTree } from '@typescript-eslint/utils';

import {
  chainBaseName,
  createAntiFlakeRule,
  HOOK_DEFINERS,
  isFunctionLike,
  TEST_DEFINERS,
} from './anti-flake-shared.ts';

/**
 * The no-per-test-timeout rule: the time budget and the retry count are
 * workspace settings (`VITEST_TEST_TIMEOUT_MS`, `VITEST_RETRY` in
 * `@tools/dotfiles`), not per-test knobs. A bumped timeout or a retry hides a
 * slow or flaky test instead of fixing it.
 *
 *   - `it(name, fn, 30_000)` / `it(name, { timeout }, fn)` /
 *     `it(name, fn, { timeout })`, the same on `test`/`describe`/`it.each(…)`.
 *   - `beforeAll(fn, 30_000)` and the other lifecycle hooks.
 *   - `{ retry: N }` in a test's options.
 *   - `vi.setConfig({ testTimeout | hookTimeout })`.
 *
 * `waitFor({ timeout })` and `findBy*(…, { timeout })` are assertion budgets
 * and are not flagged. Env-gated `*.integration.test.ts` suites, which do real
 * I/O, are excluded by the consuming config rather than here.
 */

type MessageIds = 'perTestRetry' | 'perTestTimeout' | 'setConfigTimeout';

const CONFIG_TIMEOUT_KEYS: ReadonlySet<string> = new Set([
  'hookTimeout',
  'testTimeout',
]);

const findKey = (
  node: TSESTree.Node | undefined,
  keys: ReadonlySet<string>,
): TSESTree.Property | null => {
  if (node?.type !== 'ObjectExpression') return null;
  for (const property of node.properties) {
    if (
      property.type === 'Property' &&
      !property.computed &&
      property.key.type === 'Identifier' &&
      keys.has(property.key.name)
    ) {
      return property;
    }
  }
  return null;
};

const TIMEOUT_KEY: ReadonlySet<string> = new Set(['timeout']);
const RETRY_KEY: ReadonlySet<string> = new Set(['retry']);

const isVitestSetConfig = (callee: TSESTree.Node): boolean =>
  callee.type === 'MemberExpression' &&
  !callee.computed &&
  callee.object.type === 'Identifier' &&
  callee.object.name === 'vi' &&
  callee.property.type === 'Identifier' &&
  callee.property.name === 'setConfig';

export const noPerTestTimeout = createAntiFlakeRule<[], MessageIds>({
  create(context) {
    const checkTestCall = (node: TSESTree.CallExpression): void => {
      const [, second, third] = node.arguments;

      for (const options of [second, third]) {
        const timeout = findKey(options, TIMEOUT_KEY);
        if (timeout) {
          context.report({ messageId: 'perTestTimeout', node: timeout });
        }
        const retry = findKey(options, RETRY_KEY);
        if (retry) context.report({ messageId: 'perTestRetry', node: retry });
      }

      if (
        third !== undefined &&
        third.type !== 'ObjectExpression' &&
        !isFunctionLike(third)
      ) {
        context.report({ messageId: 'perTestTimeout', node: third });
      }
    };

    return {
      CallExpression(node): void {
        if (isVitestSetConfig(node.callee)) {
          const key = findKey(node.arguments[0], CONFIG_TIMEOUT_KEYS);
          if (key) context.report({ messageId: 'setConfigTimeout', node: key });
          return;
        }

        const base = chainBaseName(node.callee);
        if (base === null) return;

        if (TEST_DEFINERS.has(base)) {
          checkTestCall(node);
          return;
        }

        const timeout = node.arguments[1];
        if (HOOK_DEFINERS.has(base) && timeout !== undefined) {
          context.report({ messageId: 'perTestTimeout', node: timeout });
        }
      },
    };
  },
  defaultOptions: [],
  meta: {
    docs: {
      description:
        'Disallow per-test timeout and retry overrides; the workspace Vitest config owns both.',
    },
    messages: {
      perTestRetry:
        'Per-test `retry` hides a flaky test. Fix the flake; the workspace pins `retry` to 0 (`VITEST_RETRY`).',
      perTestTimeout:
        'Per-test timeout override. The workspace budget is `VITEST_TEST_TIMEOUT_MS`; make the test faster (fake timers, mocks), or move real I/O to a `*.integration.test.ts` suite.',
      setConfigTimeout:
        '`vi.setConfig` timeout override. The workspace budget is `VITEST_TEST_TIMEOUT_MS`; make the test faster, or move real I/O to a `*.integration.test.ts` suite.',
    },
    schema: [],
    type: 'problem',
  },
  name: 'no-per-test-timeout',
});
