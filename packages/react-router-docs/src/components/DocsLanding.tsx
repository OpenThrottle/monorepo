import * as React from 'react';
import clsx from 'clsx';
import { ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { formatGroupLabel } from '../utils/buildDocsNav';
import type { DocsNavGroup } from '../utils/buildDocsNav';
import type { DocEntry } from '../utils/buildDocsManifest';

export interface DocsLandingProps {
  readonly className?: string;
  readonly groups: readonly DocsNavGroup[];
  /** Optional intro page (e.g. `docs/index.md`) rendered above the card grid. */
  readonly intro?: DocEntry | null;
}

/**
 * Card-grid overview of the docs section: an optional intro (rendered from a
 * Markdown entry, so it is present in SSR HTML) followed by one card per nav
 * group listing that group's pages. Pure from its props — the route decides
 * whether to render it (the `landing` flag) or fall back to the plain index page.
 *
 * @public
 */
export const DocsLanding = (props: DocsLandingProps): React.ReactElement => {
  const { className, groups, intro = null } = props;

  // Markup
  return (
    <div
      className={clsx('flex flex-col gap-8', className)}
      data-testid="DocsLanding"
    >
      {intro !== null ? <MarkdownRenderer source={intro.content} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.label}>
            <CardHeader>
              <CardTitle>{formatGroupLabel(group.label)}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      className="text-muted-foreground hover:text-foreground group flex items-center gap-1 text-sm"
                      to={item.path}
                    >
                      <ArrowRightIcon className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
