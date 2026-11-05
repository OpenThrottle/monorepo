import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { dataFileShape } from '../rules/data-file-shape.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester();

const DATA_FILE = 'app/routing/settings/data/data.agent-clis.ts';

const BASENAME = 'data.agent-clis.ts';
const VALUES = `export const AGENT_CLIS = ['claude', 'codex'] as const;\n`;

ruleTester.run('data-file-shape', dataFileShape, {
  invalid: [
    // A suffix where the prefix belongs.
    {
      code: VALUES,
      errors: [
        {
          data: {
            basename: 'mcp-connectors.data.ts',
            expected: 'data.mcp-connectors.ts',
          },
          messageId: 'misnamed',
        },
      ],
      filename: 'app/routing/settings/data/mcp-connectors.data.ts',
    },
    // No prefix at all.
    {
      code: VALUES,
      errors: [{ messageId: 'misnamed' }],
      filename: 'src/data/chat-run-phase-copy.ts',
    },
    // The prefix, but not kebab-case.
    {
      code: VALUES,
      errors: [{ messageId: 'misnamed' }],
      filename: 'src/data/data.agentClis.ts',
    },
    // An exported function declaration.
    {
      code: `export function mergeAgentClis(a: string[], b: string[]): string[] { return [...a, ...b]; }\n`,
      errors: [
        {
          data: { basename: BASENAME, name: 'mergeAgentClis' },
          messageId: 'exportsFunction',
        },
      ],
      filename: DATA_FILE,
    },
    // An exported arrow, alongside a value that passes.
    {
      code: `${VALUES}export const filterAgentClis = (query: string): string[] => { return AGENT_CLIS.filter((cli) => cli.includes(query)); };\n`,
      errors: [
        {
          data: { basename: BASENAME, name: 'filterAgentClis' },
          messageId: 'exportsFunction',
        },
      ],
      filename: DATA_FILE,
    },
    // An exported function expression behind `satisfies`.
    {
      code: `type Fn = () => number;\nexport const count = function () { return 1; } satisfies Fn;\n`,
      errors: [
        {
          data: { basename: BASENAME, name: 'count' },
          messageId: 'exportsFunction',
        },
      ],
      filename: DATA_FILE,
    },
    // A local function exported through a specifier list.
    {
      code: `const collect = (): number[] => { return []; };\nconst ROWS = [1];\nexport { collect, ROWS };\n`,
      errors: [
        {
          data: { basename: BASENAME, name: 'collect' },
          messageId: 'exportsFunction',
        },
      ],
      filename: DATA_FILE,
    },
    // A default-exported function.
    {
      code: `export default function build(): number { return 1; }\n`,
      errors: [
        {
          data: { basename: BASENAME, name: 'build' },
          messageId: 'exportsFunction',
        },
      ],
      filename: DATA_FILE,
    },
    // Misnamed and exporting a function: both reported.
    {
      code: `export const toRow = (id: string): { id: string } => { return { id }; };\n`,
      errors: [{ messageId: 'misnamed' }, { messageId: 'exportsFunction' }],
      filename: 'app/routing/settings/data/url-matrix-rows.ts',
    },
  ],
  valid: [
    // A conforming data file of values.
    { code: VALUES, filename: DATA_FILE },
    // Copy and fixtures.
    {
      code: `export const COPY = { title: \`Settings\` } as const;\n`,
      filename: 'src/data/data.copy.ts',
    },
    { code: VALUES, filename: 'src/data/mock.plans.ts' },
    // `.tsx` when the data needs JSX.
    {
      code: `export const ICON = <svg />;\n`,
      filename: 'src/data/data.icons.tsx',
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    },
    // An object holding a method is a value, not an exported function; a
    // non-exported helper is allowed (it is not part of the file's surface).
    {
      code: `const double = (n: number): number => { return n * 2; };\nexport const TABLE = { rows: [double(1)] };\n`,
      filename: DATA_FILE,
    },
    // Re-exports and type exports.
    {
      code: `export { helper } from '../utils/helper';\nexport type Row = { id: string };\n`,
      filename: DATA_FILE,
    },
    // A barrel is not a data file, so it keeps its name.
    {
      code: `export * from './data.agent-clis';\n`,
      filename: 'src/data/index.ts',
    },
    // Not directly under `data/`: neither check applies.
    {
      code: `export const build = (): number => { return 1; };\n`,
      filename: 'src/data/fixtures/build-rows.ts',
    },
    {
      code: `export const build = (): number => { return 1; };\n`,
      filename: 'src/utils/build-rows.ts',
    },
  ],
});
