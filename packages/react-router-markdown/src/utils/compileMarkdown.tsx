import * as runtime from 'react/jsx-runtime';
import { evaluate } from '@mdx-js/mdx';
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
 * Compile a Markdown source string into a renderable React component using MDX
 * (https://mdxjs.com). Input is parsed as CommonMark via `format: 'md'`, so
 * `{...}` and `<...>` are treated as literal text rather than MDX expressions
 * or JSX — that keeps it a safe drop-in for arbitrary Markdown. GFM (tables,
 * strikethrough, task lists, autolinks) is enabled through `remark-gfm`. The
 * returned component reads component overrides from the nearest `MDXProvider`
 * via `useMDXComponents`.
 */
export const compileMarkdown = async (
  options: CompileMarkdownOptions,
): Promise<CompiledMarkdown> => {
  const { source } = options;

  const { default: Content } = await evaluate(source, {
    ...runtime,
    format: 'md',
    remarkPlugins: [remarkGfm],
    useMDXComponents,
  });

  return Content;
};
