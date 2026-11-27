import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { dataNestedFunction } from '../dataNestedFunction.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const COPY_FILE = 'app/routing/usage/data/copy.ts';

ruleTester.run('data-nested-function', dataNestedFunction, {
  invalid: [
    // The case the rule exists for: a copy entry that is a function.
    {
      code: `export const USAGE_COPY = {\n  title: \`Usage\`,\n  count: (n: number): string => { return \`\${n} rows\`; },\n} as const;\n`,
      errors: [
        {
          data: { basename: 'copy.ts', path: 'USAGE_COPY.count' },
          messageId: 'nestedFunction',
        },
      ],
      filename: COPY_FILE,
    },
    // Nested deeper, through `satisfies`, and as a method.
    {
      code: `export const COPY = {\n  meta: { readingTime(minutes: number): string { return String(minutes); } },\n} satisfies Record<string, unknown>;\n`,
      errors: [
        {
          data: { basename: 'copy.ts', path: 'COPY.meta.readingTime' },
          messageId: 'nestedFunction',
        },
      ],
      filename: COPY_FILE,
    },
    // A function expression inside an array, and a non-exported const.
    {
      code: `const ROWS = [{ id: 'a' }, function build(): number { return 1; }];\nexport const TABLE = { rows: ROWS };\n`,
      errors: [
        {
          data: { basename: 'copy.ts', path: 'ROWS[1]' },
          messageId: 'nestedFunction',
        },
      ],
      filename: COPY_FILE,
    },
    // A default-exported object.
    {
      code: `export default { label: (): string => { return 'x'; } };\n`,
      errors: [
        {
          data: { basename: 'copy.ts', path: 'default.label' },
          messageId: 'nestedFunction',
        },
      ],
      filename: COPY_FILE,
    },
  ],
  valid: [
    // Values, `{token}` templates and a call's result are data.
    {
      code: `export const COPY = {\n  count: \`{count} rows\`,\n  list: ['a', 'b'],\n  total: String(2),\n} as const;\n`,
      filename: COPY_FILE,
    },
    // A top-level exported function is data-file-shape's, not this rule's.
    {
      code: `export const build = (): number => { return 1; };\n`,
      filename: COPY_FILE,
    },
    // Spreads are not followed.
    {
      code: `import { BASE } from './base';\nexport const COPY = { ...BASE };\n`,
      filename: COPY_FILE,
    },
    // Not directly under `data/`.
    {
      code: `export const COPY = { count: (n: number): string => { return String(n); } };\n`,
      filename: 'app/routing/usage/utils/copy.ts',
    },
  ],
});
