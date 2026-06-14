import * as React from 'react';
import classnames from 'classnames';
import { MDXProvider } from '@mdx-js/react';
import { compileMarkdown } from '../utils/compileMarkdown';
import type { CompiledMarkdown } from '../utils/compileMarkdown';

type MarkdownComponents = React.ComponentProps<
  typeof MDXProvider
>['components'];

export interface MarkdownRendererProps {
  readonly className?: string;
  readonly components?: MarkdownComponents;
  readonly source: string;
}

export const MarkdownRenderer = (
  props: MarkdownRendererProps,
): React.ReactElement => {
  const { className, components, source } = props;

  // Hooks
  const [Content, setContent] = React.useState<CompiledMarkdown | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    let active = true;

    compileMarkdown({ source })
      .then((compiled) => {
        if (!active) return;
        setError(null);
        // Functional update: `compiled` is itself a component, so the plain
        // setter form would be treated as a state updater.
        setContent(() => compiled);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setContent(null);
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      });

    return () => {
      active = false;
    };
  }, [source]);

  // 🔌 Short Circuit
  if (error) {
    return (
      <div className={className} data-testid="MarkdownRenderer" role="alert">
        {error.message}
      </div>
    );
  }

  if (!Content) {
    return <div className={className} data-testid="MarkdownRenderer" />;
  }

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
