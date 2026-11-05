import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { namedFunctionBlockBody } from '../rules/named-function-block-body.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('named-function-block-body', namedFunctionBlockBody, {
  invalid: [
    // A named concise arrow: reported and wrapped in a block.
    {
      code: 'const double = (x: number): number => x * 2;',
      errors: [{ messageId: 'conciseBody' }],
      output: 'const double = (x: number): number => { return x * 2; };',
    },
    // An exported one is still bound to a declarator.
    {
      code: 'export const isActive = (row: Row) => row.active;',
      errors: [{ messageId: 'conciseBody' }],
      output: 'export const isActive = (row: Row) => { return row.active; };',
    },
    // An object-literal body: the wrapping parentheses are dropped.
    {
      code: 'const toRow = (run: Run) => ({ label: run.id, value: run.status });',
      errors: [{ messageId: 'conciseBody' }],
      output: `const toRow = (run: Run) => { return { label: run.id, value: run.status }; };`,
    },
    // A multi-line object-literal body, as Prettier prints it.
    {
      code: [
        'const toRow = (run: Run): Row => ({',
        '  label: run.id,',
        '  value: run.status,',
        '});',
      ].join('\n'),
      errors: [{ messageId: 'conciseBody' }],
      output: [
        'const toRow = (run: Run): Row => { return {',
        '  label: run.id,',
        '  value: run.status,',
        '}; };',
      ].join('\n'),
    },
    // `as const` on an object literal keeps its assertion.
    {
      code: "const pair = () => ({ a: 'x' }) as const;",
      errors: [{ messageId: 'conciseBody' }],
      output: "const pair = () => { return ({ a: 'x' }) as const; };",
    },
    // A sequence expression keeps its parentheses.
    {
      code: 'const tick = () => (count++, count);',
      errors: [{ messageId: 'conciseBody' }],
      output: 'const tick = () => { return (count++, count); };',
    },
    // A class property arrow.
    {
      code: 'class Store { read = () => this.value; }',
      errors: [{ messageId: 'conciseBody' }],
      output: 'class Store { read = () => { return this.value; }; }',
    },
    // A curried function: only the named (outer) arrow is reported.
    {
      code: 'const add = (a: number) => (b: number) => a + b;',
      errors: [{ messageId: 'conciseBody' }],
      output: 'const add = (a: number) => { return (b: number) => a + b; };',
    },
    // A comment between the arrow and the body: reported, but not fixed.
    {
      code: 'const id = (x: number) => /* same */ x;',
      errors: [{ messageId: 'conciseBody' }],
      output: null,
    },
  ],
  valid: [
    // Already a block body.
    'const double = (x: number): number => { return x * 2; };',
    // Inline callbacks passed as arguments are exempt.
    'const ids = rows.map((row) => row.id);',
    'rows.filter((row) => row.active).forEach((row) => log(row));',
    // An object-literal method counts as inline.
    'const handlers = { onSelect: () => setOpen(true) };',
    // A JSX attribute callback is inline.
    {
      code: 'const el = <button onClick={() => setOpen(true)} />;',
      languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
    // A default-parameter arrow is not bound to a declarator.
    'function run(cb = () => undefined) { return cb(); }',
    // A function declaration is not an arrow.
    'function double(x: number): number { return x * 2; }',
  ],
});
