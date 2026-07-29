import * as React from 'react';
import clsx from 'clsx';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { DocPageToc } from './DocPageToc';
import { DOC_HEADING_COMPONENTS } from '../utils/docHeadingComponents';
import { extractDocHeadings } from '../utils/docHeadings';
import type { DocEntry } from '../utils/buildDocsManifest';

export interface DocPageViewProps {
  readonly className?: string;
  readonly entry: DocEntry;
  /**
   * Render the on-page TOC rail and give h2/h3 headings stable ids + copy
   * anchors. Off by default so the page renders as a single column.
   */
  readonly toc?: boolean;
}

/**
 * Render a single docs page. The Markdown body (which carries its own heading)
 * is rendered by `MarkdownRenderer`, so content is present in server-rendered
 * HTML. When `toc` is set, an "on this page" rail is added on the right and
 * headings gain anchor ids + a hover copy-link (see {@link DOC_HEADING_COMPONENTS}).
 *
 * @public
 */
export const DocPageView = (props: DocPageViewProps): React.ReactElement => {
  const { className, entry, toc = false } = props;

  // Hooks
  const headings = React.useMemo(
    () => (toc ? extractDocHeadings(entry.content) : []),
    [toc, entry.content],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-col gap-8 xl:flex-row', className)}
      data-testid="DocPageView"
    >
      <article className="max-w-3xl min-w-0 flex-1">
        <MarkdownRenderer
          components={toc ? DOC_HEADING_COMPONENTS : undefined}
          source={entry.content}
        />
      </article>

      {toc && headings.length > 0 ? (
        <DocPageToc
          className="hidden xl:block xl:w-56 xl:shrink-0"
          headings={headings}
        />
      ) : null}
    </div>
  );
};
