import * as runtime from 'react/jsx-runtime';
import { evaluate, evaluateSync } from '@mdx-js/mdx';
import { useMDXComponents } from '@mdx-js/react';
import remarkGfm from 'remark-gfm';

export interface CompileMarkdownOptions {
  readonly source: string;
}

/**
 * The compiled MDX content component returned by `evaluate`. Derived from the
 * library's own return type so we never import `mdx/types` directly (it is a
 * transitive dependency of `@mdx-js/*`, not a direct one).
 */
export type CompiledMarkdown = Awaited<ReturnType<typeof evaluate>>['default'];

/**
 * Shared MDX evaluate options. Input is parsed as CommonMark via `format: 'md'`,
 * so `{...}` and `<...>` are treated as literal text rather than MDX expressions
 * or JSX — that keeps it a safe drop-in for arbitrary Markdown. GFM (tables,
 * strikethrough, task lists, autolinks) is enabled through `remark-gfm`, which
 * is a synchronous remark plugin (so it works with both `evaluate` and
 * `evaluateSync`). The compiled component reads component overrides from the
 * nearest `MDXProvider` via `useMDXComponents`.
 */
const EVALUATE_OPTIONS = {
  ...runtime,
  format: 'md',
  remarkPlugins: [remarkGfm],
  useMDXComponents,
} satisfies Parameters<typeof evaluate>[1];

/**
 * Compile a Markdown source string into a renderable React component using MDX
 * (https://mdxjs.com). See {@link EVALUATE_OPTIONS} for parsing behavior.
 */
export const compileMarkdown = async (
  options: CompileMarkdownOptions,
): Promise<CompiledMarkdown> => {
  const { source } = options;

  const { default: Content } = await evaluate(source, EVALUATE_OPTIONS);

  return Content;
};

/**
 * Synchronous variant of {@link compileMarkdown}. Because it returns the
 * compiled component directly (no Promise), callers can compile during render —
 * which means the output is present in server-rendered HTML rather than being
 * deferred to a client-side effect. Safe here because the only remark plugin
 * (`remark-gfm`) is synchronous; `evaluateSync` throws if an async plugin is
 * supplied.
 */
export const compileMarkdownSync = (
  options: CompileMarkdownOptions,
): CompiledMarkdown => {
  const { source } = options;

  const { default: Content } = evaluateSync(source, EVALUATE_OPTIONS);

  return Content;
};
