import * as React from 'react';
import clsx from 'clsx';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { DocPagePager } from './DocPagePager';
import { DocPageToc } from './DocPageToc';
import { DOC_CODE_COMPONENTS } from '../utils/docCodeComponents';
import { DOC_HEADING_COMPONENTS } from '../utils/docHeadingComponents';
import { extractDocHeadings } from '../utils/docHeadings';
import { getDocPager } from '../utils/buildDocsNav';
import type { DocsNavItem } from '../utils/buildDocsNav';
import type { DocEntry } from '../utils/buildDocsManifest';

export interface DocPageViewProps {
  readonly className?: string;
  /** Add a copy button to fenced code blocks. */
  readonly codeCopy?: boolean;
  readonly entry: DocEntry;
  /** Render prev/next paging at the bottom of the page. */
  readonly prevNext?: boolean;
  /**
   * Flat reading order (see `flattenDocsNav`) used to derive prev/next links
   * when {@link DocPageViewProps.prevNext} is set.
   */
  readonly sequence?: readonly DocsNavItem[];
  /**
   * Render the on-page TOC rail and give h2/h3 headings stable ids + copy
   * anchors. Off by default so the page renders as a single column.
   */
  readonly toc?: boolean;
}

/**
 * Render a single docs page. The Markdown body (which carries its own heading)
 * is rendered by `MarkdownRenderer`, so content is present in server-rendered
 * HTML. Optional, independently-gated upgrades: an "on this page" TOC rail with
 * heading anchors (`toc`), copy buttons on code blocks (`codeCopy`), and
 * sequential prev/next paging (`prevNext`, driven by `sequence`).
 *
 * @public
 */
export const DocPageView = (props: DocPageViewProps): React.ReactElement => {
  const {
    className,
    codeCopy = false,
    entry,
    prevNext = false,
    sequence,
    toc = false,
  } = props;

  // Hooks
  const headings = React.useMemo(
    () => (toc ? extractDocHeadings(entry.content) : []),
    [toc, entry.content],
  );

  const components = React.useMemo(() => {
    const merged = {
      ...(toc ? DOC_HEADING_COMPONENTS : {}),
      ...(codeCopy ? DOC_CODE_COMPONENTS : {}),
    };
    return Object.keys(merged).length > 0 ? merged : undefined;
  }, [codeCopy, toc]);

  // Setup
  const pager =
    prevNext && sequence !== undefined
      ? getDocPager(sequence, entry.path)
      : null;

  // 🔌 Short Circuit

  // Markup
  return (
    <div
      className={clsx('flex flex-col gap-8 xl:flex-row', className)}
      data-testid="DocPageView"
    >
      <div className="max-w-3xl min-w-0 flex-1">
        <article>
          <MarkdownRenderer components={components} source={entry.content} />
        </article>

        {pager !== null ? (
          <DocPagePager className="mt-10" next={pager.next} prev={pager.prev} />
        ) : null}
      </div>

      {toc && headings.length > 0 ? (
        <DocPageToc
          className="hidden xl:block xl:w-56 xl:shrink-0"
          headings={headings}
        />
      ) : null}
    </div>
  );
};
