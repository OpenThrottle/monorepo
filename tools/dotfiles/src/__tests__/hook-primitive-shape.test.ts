import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { hookPrimitiveShape } from '../rules/hook-primitive-shape.ts';

// Wire the framework hooks the RuleTester calls to Vitest's.
RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const MARKER_BLOCK = `  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
`;

// The canonical shape from docs/monorepo/hook-primitive-shape.md.
const CONFORMANT = `import * as React from 'react';

export interface UseFooOptions {
  readonly initialValue: string | undefined;
}

export interface UseFooResult {
  readonly value: string | undefined;
}

export const useFoo = (options: UseFooOptions): UseFooResult => {
  const { initialValue } = options;

${MARKER_BLOCK}
  return { value: initialValue };
};
`;

/** A conformant hook body with the given declarations around it. */
const hookFile = (before: string, after = ''): string => `${before}
export const useFoo = (): boolean => {
${MARKER_BLOCK}
  return true;
};
${after}`;

ruleTester.run('hook-primitive-shape', hookPrimitiveShape, {
  invalid: [
    // ---- H1 ----------------------------------------------------------------
    {
      code: `import * as React from 'react';
`,
      errors: [{ messageId: 'missingHook' }],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile('').replace('useFoo', 'useBar'),
      errors: [{ messageId: 'misnamedHook' }],
      filename: 'useFoo.ts',
    },
    {
      code: `${hookFile('')}
export const useBar = (): boolean => {
${MARKER_BLOCK}
  return true;
};
`,
      errors: [{ data: { name: 'useBar' }, messageId: 'extraHook' }],
      filename: 'useFoo.ts',
    },
    {
      code: `${hookFile('')}
export function useBar(): boolean {
${MARKER_BLOCK}
  return true;
}
`,
      errors: [{ data: { name: 'useBar' }, messageId: 'extraHook' }],
      filename: 'useFoo.ts',
    },
    // A non-exported module-scope hook is reported exactly once (H1/H3).
    {
      code: hookFile(`const useHelper = (): boolean => true;\n`),
      errors: [{ data: { name: 'useHelper' }, messageId: 'nonExportedHook' }],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(`function useHelper(): boolean {\n  return true;\n}\n`),
      errors: [{ data: { name: 'useHelper' }, messageId: 'nonExportedHook' }],
      filename: 'useFoo.ts',
    },

    // ---- H2 ----------------------------------------------------------------
    {
      code: hookFile(`export interface FooRow {\n  readonly id: string;\n}\n`),
      errors: [
        {
          data: {
            name: 'FooRow',
            options: 'UseFooOptions',
            result: 'UseFooResult',
          },
          messageId: 'exportedType',
        },
      ],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(`export type FooRow = string;\n`),
      errors: [{ messageId: 'exportedType' }],
      filename: 'useFoo.ts',
    },
    // `Options` must be an interface; only `Result` may be a type alias.
    {
      code: hookFile(`export type UseFooOptions = { readonly a: string };\n`),
      errors: [{ messageId: 'exportedType' }],
      filename: 'useFoo.ts',
    },
    // Interfaces named after a different hook do not qualify.
    {
      code: hookFile(`export interface UseBarOptions {}\n`),
      errors: [{ messageId: 'exportedType' }],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(
        `export function toKey(id: string): string {\n  return id;\n}\n`,
      ),
      errors: [{ data: { name: 'toKey' }, messageId: 'exportedFunction' }],
      filename: 'useFoo.ts',
    },
    // An exported const is one H2 report — not also an H3 report.
    {
      code: hookFile(`export const FOO_DELAY_MS = 250;\n`),
      errors: [{ data: { name: 'FOO_DELAY_MS' }, messageId: 'exportedValue' }],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(`export class FooError extends Error {}\n`),
      errors: [{ data: { name: 'FooError' }, messageId: 'exportedValue' }],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(`import { a } from './a.ts';\n`, `export { a };\n`),
      errors: [{ messageId: 'reExport' }],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile('', `export { b } from './b.ts';\n`),
      errors: [{ messageId: 'reExport' }],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile('', `export * from './b.ts';\n`),
      errors: [{ messageId: 'reExport' }],
      filename: 'useFoo.ts',
    },

    // ---- H3 ----------------------------------------------------------------
    {
      code: hookFile(`const NO_ITEMS: readonly string[] = [];\n`),
      errors: [
        {
          data: { kind: 'constant', where: '`data/` or `config/`' },
          messageId: 'moduleScopeValue',
        },
      ],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(`let counter = 0;\n`),
      errors: [{ messageId: 'moduleScopeValue' }],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(`const toKey = (id: string): string => id;\n`),
      errors: [{ messageId: 'moduleScopeValue' }],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(`function toKey(id: string): string {\n  return id;\n}\n`),
      errors: [
        {
          data: { kind: 'function', where: '`utils/`' },
          messageId: 'moduleScopeValue',
        },
      ],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(`class Helper {}\n`),
      errors: [
        {
          data: { kind: 'class', where: '`utils/`' },
          messageId: 'moduleScopeValue',
        },
      ],
      filename: 'useFoo.ts',
    },
    {
      code: hookFile(`console.log('loaded');\n`),
      errors: [
        {
          data: { kind: 'statement', where: '`utils/`' },
          messageId: 'moduleScopeValue',
        },
      ],
      filename: 'useFoo.ts',
    },

    // ---- H4 ----------------------------------------------------------------
    // No markers at all — autofix scaffolds all six.
    {
      code: `export const useFoo = (): boolean => {
  return true;
};
`,
      errors: Array.from({ length: 6 }, () => ({
        messageId: 'missingMarker' as const,
      })),
      filename: 'useFoo.ts',
      output: `export const useFoo = (): boolean => {
${MARKER_BLOCK.replace(/\n$/, '')}

  return true;
};
`,
    },
    // `export function` hooks are scaffolded too.
    {
      code: `export function useFoo(): boolean {
  return true;
}
`,
      errors: Array.from({ length: 6 }, () => ({
        messageId: 'missingMarker' as const,
      })),
      filename: 'useFoo.ts',
      output: `export function useFoo(): boolean {
${MARKER_BLOCK.replace(/\n$/, '')}

  return true;
}
`,
    },
    // Partially marked — reported, never auto-fixed.
    {
      code: `export const useFoo = (): boolean => {
  // Hooks

  // Setup

  return true;
};
`,
      errors: [
        { data: { marker: 'Handlers' }, messageId: 'missingMarker' },
        { data: { marker: 'Markup' }, messageId: 'missingMarker' },
        { data: { marker: 'Life Cycle' }, messageId: 'missingMarker' },
        { data: { marker: '🔌 Short Circuit' }, messageId: 'missingMarker' },
      ],
      filename: 'useFoo.ts',
      output: null,
    },
    // Out of order.
    {
      code: `export const useFoo = (): boolean => {
  // Hooks

  // Handlers

  // Setup

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return true;
};
`,
      errors: [{ messageId: 'markerOutOfOrder' }],
      filename: 'useFoo.ts',
    },
    // Missing blank line before a marker.
    {
      code: `export const useFoo = (): boolean => {
  // Hooks

  // Setup
  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return true;
};
`,
      errors: [
        { data: { marker: 'Handlers' }, messageId: 'markerMissingBlankLine' },
      ],
      filename: 'useFoo.ts',
    },

    // ---- H5 ----------------------------------------------------------------
    {
      code: `export const useFoo = () => {
${MARKER_BLOCK}
  return true;
};
`,
      errors: [{ data: { name: 'useFoo' }, messageId: 'missingReturnType' }],
      filename: 'useFoo.ts',
    },
    {
      code: `export function useFoo() {
${MARKER_BLOCK}
  return true;
}
`,
      errors: [{ messageId: 'missingReturnType' }],
      filename: 'useFoo.ts',
    },
    // A kebab file still gets H5 (and no H1 report).
    {
      code: `export const useFooBar = () => {
${MARKER_BLOCK}
  return true;
};
`,
      errors: [{ messageId: 'missingReturnType' }],
      filename: 'use-foo-bar.ts',
    },
  ],
  valid: [
    // The canonical shape.
    { code: CONFORMANT, filename: 'useFoo.ts' },
    { code: CONFORMANT, filename: '/repo/src/hooks/useFoo.tsx' },
    // Positional args, boolean return, neither interface.
    {
      code: `export const useFoo = (value: string, delayMs: number): boolean => {
${MARKER_BLOCK}
  return value.length > delayMs;
};
`,
      filename: 'useFoo.ts',
    },
    // `void` is an explicit return type.
    {
      code: `export const useFoo = (): void => {
${MARKER_BLOCK}
};
`,
      filename: 'useFoo.ts',
    },
    // Generic arrow hook (`<T,>` in .tsx).
    {
      code: `export interface UseFooOptions<T> {
  readonly value: T;
}

export interface UseFooResult<T> {
  readonly value: T;
}

export const useFoo = <T,>(options: UseFooOptions<T>): UseFooResult<T> => {
  const { value } = options;

${MARKER_BLOCK}
  return { value };
};
`,
      filename: 'useFoo.tsx',
    },
    // `export function` hook with type params.
    {
      code: `export function useFoo<T>(value: T): T {
${MARKER_BLOCK}
  return value;
}
`,
      filename: 'useFoo.ts',
    },
    // Result may be a type alias (union / tuple return).
    {
      code: `export type UseFooResult = readonly [string, (next: string) => void];

export const useFoo = (): UseFooResult => {
${MARKER_BLOCK}
  return ['', () => undefined];
};
`,
      filename: 'useFoo.ts',
    },
    // Imports, directives, non-exported types and `declare` are module-scope-safe.
    {
      code: `'use client';

import * as React from 'react';
import type { Row } from '../types.ts';

interface Internal {
  readonly row: Row;
}

type Local = Internal | undefined;

declare const __DEV__: boolean;

export const useFoo = (): Local => {
${MARKER_BLOCK}
  return undefined;
};
`,
      filename: 'useFoo.ts',
    },
    // A kebab file name with a matching camelCase hook does not trip H1.
    {
      code: `export const useFooBar = (): boolean => {
${MARKER_BLOCK}
  return true;
};
`,
      filename: 'use-foo-bar.ts',
    },
    // The first marker may sit directly after the opening brace.
    {
      code: `export const useFoo = (): boolean => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return true;
};
`,
      filename: 'useFoo.ts',
    },
    // Opt-out: a first-line block comment disables every check.
    {
      code: `/* hook-shape: opt-out — vendored verbatim from upstream */
export const NOT_A_HOOK = 1;
export const useBar = () => true;
`,
      filename: 'useFoo.ts',
    },
  ],
});
