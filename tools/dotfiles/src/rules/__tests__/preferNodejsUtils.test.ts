import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { preferNodejsUtils } from '../preferNodejsUtils.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const options = [{ allow: ['packages/nodejs-utils/', 'scripts/'] }] as const;

ruleTester.run('prefer-nodejs-utils', preferNodejsUtils, {
  invalid: [
    {
      code: `const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};`,
      errors: [
        {
          data: { name: 'isRecord', replacement: 'isRecord' },
          messageId: 'localCopy',
        },
      ],
      filename: '/repo/packages/feature/src/parse.ts',
      options,
    },
    {
      code: `function describeError(error: unknown): string {
  return String(error);
}`,
      errors: [
        {
          data: { name: 'describeError', replacement: 'toErrorMessage' },
          messageId: 'localCopy',
        },
      ],
      filename: '/repo/applications/app/src/x.ts',
      options,
    },
    {
      code: `const sleep = async function (ms: number): Promise<void> {};`,
      errors: [{ messageId: 'localCopy' }],
      filename: '/repo/packages/feature/src/x.ts',
      options,
    },
    {
      code: `const message = error instanceof Error ? error.message : String(error);`,
      errors: [{ data: { subject: 'error' }, messageId: 'inlineErrorMessage' }],
      filename: '/repo/packages/feature/src/x.ts',
      options,
    },
    {
      code: `const message = result.cause instanceof Error ? result.cause.message : String(result.cause);`,
      errors: [
        { data: { subject: 'result.cause' }, messageId: 'inlineErrorMessage' },
      ],
      filename: '/repo/packages/feature/src/x.ts',
      options,
    },
  ],
  valid: [
    {
      // The package that owns the helpers.
      code: `export const isRecord = (value: unknown): boolean => typeof value === 'object';`,
      filename: '/repo/packages/nodejs-utils/src/utils/guards.ts',
      options,
    },
    {
      code: `const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));`,
      filename: '/repo/scripts/setup.ts',
      options,
    },
    {
      // A deliberately different guard under a name that says so.
      code: `const isObjectLike = (value: unknown): boolean => typeof value === 'object' && value !== null;`,
      filename: '/repo/packages/feature/src/x.ts',
      options,
    },
    {
      // A mock bound to a helper's name is not a declaration of one.
      code: `const sleep = vi.fn(noSleep);`,
      filename: '/repo/packages/feature/src/__tests__/x.test.ts',
      options,
    },
    {
      // A different fallback is a different behavior.
      code: `const message = error instanceof Error ? error.message : 'Unknown error';`,
      filename: '/repo/packages/feature/src/x.ts',
      options,
    },
    {
      code: `const message = a instanceof Error ? b.message : String(a);`,
      filename: '/repo/packages/feature/src/x.ts',
      options,
    },
  ],
});
