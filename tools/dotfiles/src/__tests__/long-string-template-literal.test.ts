import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { longStringTemplateLiteral } from '../rules/longStringTemplateLiteral.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const errors = [{ messageId: 'useTemplateLiteral' as const }];

ruleTester.run('long-string-template-literal', longStringTemplateLiteral, {
  invalid: [
    // An object property Prettier wrapped below its key.
    {
      code: [
        'const COPY = {',
        '  notResumedSuffix:',
        "    'Not resumed automatically — the next scheduled fire picks it up.',",
        '};',
      ].join('\n'),
      errors,
      output: [
        'const COPY = {',
        '  notResumedSuffix: `Not resumed automatically — the next scheduled fire picks it up.`,',
        '};',
      ].join('\n'),
    },
    // A double-quoted string wrapped below a `const x =` declarator.
    {
      code: [
        'const message =',
        '  "The schedule could not be resumed because its plan was archived.";',
      ].join('\n'),
      errors,
      output: `const message = \`The schedule could not be resumed because its plan was archived.\`;`,
    },
    // A class property; the quote escape is dropped, backticks and `${` are escaped.
    {
      code: [
        'class Copy {',
        '  readonly hint =',
        "    'Don\\'t type `pnpm` or ${HOME} here — the runner sets both for you.';",
        '}',
      ].join('\n'),
      errors,
      output: [
        'class Copy {',
        "  readonly hint = `Don't type \\`pnpm\\` or \\${HOME} here — the runner sets both for you.`;",
        '}',
      ].join('\n'),
    },
    // A comment between key and value is kept: reported, not fixed.
    {
      code: [
        'const COPY = {',
        '  title: // shown in the header',
        "    'A long title that Prettier has moved onto its own line here.',",
        '};',
      ].join('\n'),
      errors,
      output: null,
    },
  ],
  valid: [
    // A short string on the key's line.
    "const COPY = { title: 'Schedules' };",
    // A template literal already on the key's line.
    'const COPY = { title: `A long title that would otherwise wrap below its key.` };',
    // Call arguments are out of scope: Prettier breaks every argument.
    [
      'logger.warn(',
      "  'The schedule could not be resumed because its plan was archived.',",
      '  scheduleId,',
      ');',
    ].join('\n'),
    // Array elements are out of scope.
    [
      'const rows = [',
      "  'first long row label',",
      "  'second long row label',",
      '];',
    ].join('\n'),
    // A wrapped non-string value is out of scope.
    ['const COPY = {', '  limit:', '    1000,', '};'].join('\n'),
  ],
});
