import type { TSESTree } from '@typescript-eslint/utils';
import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * Shared plumbing for the anti-flake test rules (`no-test-sleep`,
 * `no-wall-clock-in-tests`, `no-per-test-timeout`, `skip-requires-issue`,
 * `no-fire-event`). See docs/monorepo/code-style.md, "Anti-flake test rules".
 */

export const createAntiFlakeRule = ESLintUtils.RuleCreator(
  () =>
    'https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/code-style.md#anti-flake-test-rules',
);

/** Test and suite definers: their timeout is the third argument. */
export const TEST_DEFINERS: ReadonlySet<string> = new Set([
  'bench',
  'describe',
  'fdescribe',
  'fit',
  'it',
  'suite',
  'test',
  'xdescribe',
  'xit',
  'xtest',
]);

/** Lifecycle hooks: their timeout is the second argument. */
export const HOOK_DEFINERS: ReadonlySet<string> = new Set([
  'afterAll',
  'afterEach',
  'beforeAll',
  'beforeEach',
]);

/**
 * @description The identifier a test call chain starts from: `it` for
 * `it.skip.each(rows)(...)`, `test` for `test.skipIf(ci)(...)`. Returns `null`
 * when the chain does not bottom out in a plain identifier.
 */
export const chainBaseName = (node: TSESTree.Node): string | null => {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return chainBaseName(node.object);
  if (node.type === 'CallExpression') return chainBaseName(node.callee);
  return null;
};

const FAKE_TIMERS_PATTERN = /\b(?:vi|jest)\.useFakeTimers\s*\(/;
const FAKE_CLOCK_PATTERN =
  /\b(?:vi|jest)\.(?:useFakeTimers|setSystemTime)\s*\(/;

/**
 * @description Whether the file installs fake timers anywhere. A file-level
 * check by design: under fake timers a `setTimeout` wait is virtual, and the
 * rule cannot know which `describe` the fake clock is scoped to.
 */
export const usesFakeTimers = (sourceText: string): boolean =>
  FAKE_TIMERS_PATTERN.test(sourceText);

/** @description As {@link usesFakeTimers}, also accepting `vi.setSystemTime`. */
export const usesFakeClock = (sourceText: string): boolean =>
  FAKE_CLOCK_PATTERN.test(sourceText);

/** @description Whether `node` is a function expression or arrow. */
export const isFunctionLike = (node: TSESTree.Node): boolean =>
  node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression';
