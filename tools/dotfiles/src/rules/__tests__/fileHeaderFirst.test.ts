import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { fileHeaderFirst } from '../fileHeaderFirst.ts';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

ruleTester.run('file-header-first', fileHeaderFirst, {
  invalid: [
    {
      // The codemod shape: a prepended import pushed the header down.
      code: `import { sleep } from 'pkg';
/**
 * @description What this file does.
 */

import { join } from 'node:path';

export const a = join('a', 'b');
`,
      errors: [{ line: 2, messageId: 'headerBelowImport' }],
      output: `/**
 * @description What this file does.
 */

import { sleep } from 'pkg';

import { join } from 'node:path';

export const a = join('a', 'b');
`,
    },
    {
      // Several imports above it still count, as long as one follows.
      code: `import a from 'a';
import b from 'b';
/** Header. */
import c from 'c';
`,
      errors: [{ messageId: 'headerBelowImport' }],
      output: `/** Header. */

import a from 'a';
import b from 'b';
import c from 'c';
`,
    },
  ],
  valid: [
    // Header in its place.
    `/**
 * @description What this file does.
 */

import { join } from 'node:path';
`,
    // A JSDoc block after the imports documents the declaration below it.
    `import { join } from 'node:path';

/** @description Joins. */
export const a = join('a', 'b');
`,
    // A JSDoc block on a declaration that is followed by more imports is not a header.
    `import a from 'a';
/** Doc. */
const x = 1;
import b from 'b';
`,
    // A plain block or line comment between imports is not a JSDoc header.
    `import a from 'a';
/* group: local */
import b from 'b';
`,
    `import a from 'a';
// local
import b from 'b';
`,
    // No imports at all.
    `/** Header. */
export const a = 1;
`,
  ],
});
