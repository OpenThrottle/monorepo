import * as React from 'react';
import clsx from 'clsx';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import type { DocEntry } from '../utils/buildDocsManifest';

export interface DocPageViewProps {
  readonly className?: string;
  readonly entry: DocEntry;
}

/**
 * Render a single docs page. The Markdown body (which carries its own heading)
 * is rendered by `MarkdownRenderer`, so content is present in server-rendered
 * HTML.
 *
 * @public
 */
export const DocPageView = (props: DocPageViewProps): React.ReactElement => {
  const { className, entry } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <article className={clsx('max-w-3xl', className)} data-testid="DocPageView">
      <MarkdownRenderer source={entry.content} />
    </article>
  );
};
