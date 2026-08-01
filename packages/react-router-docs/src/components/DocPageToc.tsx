import * as React from 'react';
import clsx from 'clsx';
import type { DocHeading } from '../utils/docHeadings';

export interface DocPageTocProps {
  readonly className?: string;
  /** The h2/h3 outline for the current page (see `extractDocHeadings`). */
  readonly headings: readonly DocHeading[];
  readonly title?: string;
}

/**
 * Right-rail "on this page" table of contents with active-heading scroll-spy.
 * An `IntersectionObserver` tracks which heading is in view and marks its link
 * with `aria-current`. Links are ordinary in-page anchors, so it degrades to a
 * plain, keyboard-navigable jump list without JavaScript. Pure from its
 * `headings` prop — the route/`DocPageView` decides whether to render it (the
 * `toc` flag).
 *
 * @public
 */
export const DocPageToc = (props: DocPageTocProps): React.ReactElement => {
  const { className, headings, title = 'On this page' } = props;

  // Hooks
  const [activeId, setActiveId] = React.useState<string | null>(
    headings[0]?.id ?? null,
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (headings.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const next = visible[0]?.target.id;
        if (next != null) {
          setActiveId(next);
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );

    const observed = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);

    observed.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [headings]);

  // 🔌 Short Circuit
  if (headings.length === 0) {
    return <></>;
  }

  return (
    <nav
      aria-label={title}
      className={clsx('text-sm', className)}
      data-testid="DocPageToc"
    >
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        {title}
      </p>
      <ul className="flex flex-col gap-1 border-l">
        {headings.map((heading) => {
          const isActive = heading.id === activeId;

          return (
            <li key={heading.id}>
              <a
                aria-current={isActive ? 'location' : undefined}
                className={clsx(
                  '-ml-px block border-l py-0.5 pr-2',
                  heading.depth === 3 ? 'pl-6' : 'pl-3',
                  isActive
                    ? 'border-foreground text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
                href={`#${heading.id}`}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
