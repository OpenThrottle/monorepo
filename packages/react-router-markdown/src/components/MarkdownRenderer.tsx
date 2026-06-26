import * as React from 'react';
import classnames from 'classnames';
import { MDXProvider } from '@mdx-js/react';
import { compileMarkdownSync } from '../utils/compileMarkdown';
import type { CompiledMarkdown } from '../utils/compileMarkdown';

type MarkdownComponents = React.ComponentProps<
  typeof MDXProvider
>['components'];

type CompileResult =
  | { readonly Content: CompiledMarkdown; readonly error: null }
  | { readonly Content: null; readonly error: Error };

export interface MarkdownRendererProps {
  readonly className?: string;
  readonly components?: MarkdownComponents;
  readonly source: string;
}

/**
 * Renders a Markdown `source` string as React, compiling it synchronously
 * during render (see {@link compileMarkdownSync}) so the output is present in
 * the server-rendered HTML.
 *
 * @remarks
 * **All-or-nothing compilation.** The entire `source` is compiled in one pass.
 * If any part of it fails to compile (CommonMark rarely throws, but GFM table
 * edge cases can), the renderer degrades to a single `role="alert"` element
 * showing the error message — the *whole* `source` renders as an error, not
 * just the offending fragment. There is no per-fragment error isolation here.
 *
 * Consumers that join several independently-sourced fragments (e.g. streamed
 * agent/task output chunks) into one `source` therefore risk one malformed
 * fragment blanking the entire output. To degrade gracefully, render each
 * fragment through its own `<MarkdownRenderer>` instance so a compile failure
 * is contained to that fragment rather than the whole document.
 */
export const MarkdownRenderer = (
  props: MarkdownRendererProps,
): React.ReactElement => {
  const { className, components, source } = props;

  // Hooks
  // Compile synchronously during render (memoized on `source`) so the output
  // is present in the server-rendered HTML — no client-side effect, no flash
  // of empty content. The try/catch keeps malformed input from crashing the
  // surrounding route; CommonMark (`format: 'md'`) compilation rarely throws.
  const compiled = React.useMemo<CompileResult>(() => {
    try {
      return { Content: compileMarkdownSync({ source }), error: null };
    } catch (cause: unknown) {
      return {
        Content: null,
        error: cause instanceof Error ? cause : new Error(String(cause)),
      };
    }
  }, [source]);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (compiled.error) {
    return (
      <div className={className} data-testid="MarkdownRenderer" role="alert">
        {compiled.error.message}
      </div>
    );
  }

  const { Content } = compiled;

  return (
    <div
      className={classnames('markdown max-w-full overflow-auto', className)}
      data-testid="MarkdownRenderer"
    >
      <MDXProvider components={components}>
        <Content />
      </MDXProvider>
    </div>
  );
};
