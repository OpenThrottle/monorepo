// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

/**
 * An undefined var() is invalid at computed-value time: the declaration
 * silently falls back to its inherited or initial value, with no error
 * anywhere. That is how bold rendered at weight 400 and code-block borders
 * vanished (OT plan d388ffe7). These tests catch it at the source.
 */

interface VarReference {
  readonly hasFallback: boolean;
  readonly line: number;
  readonly name: string;
}

const require = createRequire(import.meta.url);

const readCss = (path: string): string => readFileSync(path, 'utf8');

// Blank out comments but keep their newlines, so reported line numbers stay true.
const stripComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));

const collectReferences = (css: string): readonly VarReference[] =>
  [...stripComments(css).matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)].map(
    (match) => ({
      hasFallback: match[2] !== undefined,
      line: css.slice(0, match.index).split('\n').length,
      name: match[1] ?? '',
    }),
  );

const collectDefinitions = (css: string): ReadonlySet<string> =>
  new Set(
    [...stripComments(css).matchAll(/(--[\w-]+)\s*:/g)].map(
      (match) => match[1] ?? '',
    ),
  );

const markdownCss = readCss(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'index.css'),
);

const references = collectReferences(markdownCss);

const defined = new Set([
  ...collectDefinitions(
    readCss(require.resolve('@openthrottle/react-router-shadcn/src/theme.css')),
  ),
  ...collectDefinitions(readCss(require.resolve('tailwindcss/theme.css'))),
]);

const describeReference = (reference: VarReference): string =>
  `index.css:${reference.line} ${reference.name}`;

describe('react-router-markdown index.css custom properties', () => {
  test('references at least one var(), so the checks below are not vacuous', () => {
    expect(references.length).toBeGreaterThan(0);
  });

  test('every var() names a token defined by the shadcn theme or Tailwind', () => {
    const undefinedReferences = references
      .filter((reference) => !defined.has(reference.name))
      .map(describeReference);

    expect(undefinedReferences).toEqual([]);
  });

  test('every var() carries a fallback, so a renamed token degrades visibly', () => {
    const withoutFallback = references
      .filter((reference) => !reference.hasFallback)
      .map(describeReference);

    expect(withoutFallback).toEqual([]);
  });
});
