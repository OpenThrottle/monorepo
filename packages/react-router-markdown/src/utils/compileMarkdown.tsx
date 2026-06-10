import * as runtime from 'react/jsx-runtime';
import { evaluate } from '@mdx-js/mdx';
import { useMDXComponents } from '@mdx-js/react';

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
 * Compile a Markdown/MDX source string into a renderable React component using
 * MDX (https://mdxjs.com). The returned component reads any component overrides
 * from the nearest `MDXProvider` via `useMDXComponents`.
 */
export const compileMarkdown = async (
  options: CompileMarkdownOptions,
): Promise<CompiledMarkdown> => {
  const { source } = options;

  const { default: Content } = await evaluate(source, {
    ...runtime,
    useMDXComponents,
  });

  return Content;
};
