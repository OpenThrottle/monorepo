import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noPerTestTimeout } from '../rules/no-per-test-timeout.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('no-per-test-timeout', noPerTestTimeout, {
  invalid: [
    // A numeric third argument, on every definer shape.
    {
      code: "it('clones', async () => {}, 30_000);",
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      code: "test.concurrent('x', async () => {}, TIMEOUT);",
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      code: "it.each([1, 2])('row %i', async () => {}, 15000);",
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      code: "describe('suite', () => {}, 60_000);",
      errors: [{ messageId: 'perTestTimeout' }],
    },
    // Options objects, before or after the body.
    {
      code: "it('x', { timeout: 10_000 }, async () => {});",
      errors: [{ messageId: 'perTestTimeout' }],
    },
    {
      code: "test('x', async () => {}, { timeout: 10_000 });",
      errors: [{ messageId: 'perTestTimeout' }],
    },
    // Lifecycle hooks take the timeout second.
    {
      code: 'beforeAll(async () => {}, 30_000);',
      errors: [{ messageId: 'perTestTimeout' }],
    },
    // A per-test retry.
    {
      code: "it('x', { retry: 3 }, async () => {});",
      errors: [{ messageId: 'perTestRetry' }],
    },
    // vi.setConfig.
    {
      code: 'vi.setConfig({ testTimeout: 60_000 });',
      errors: [{ messageId: 'setConfigTimeout' }],
    },
  ],
  valid: [
    "it('x', async () => {});",
    "it('x', { concurrent: true }, async () => {});",
    'afterEach(cleanup);',
    "it.each([1, 2])('row %i', async () => {});",
    "test.skipIf(process.env.CI)('x', async () => {});",
    // Assertion budgets are not test timeouts.
    'await waitFor(() => expect(x).toBe(1), { timeout: 3_000 });',
    "await component.findByRole('button', {}, { timeout: 3_000 });",
    'vi.setConfig({ restoreMocks: true });',
  ],
});
