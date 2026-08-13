import * as React from 'react';
import clsx from 'clsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@openthrottle/react-router-shadcn';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { formatGroupLabel } from '../utils/buildDocsNav';
import { groupFaqEntries } from '../utils/groupFaqEntries';
import { slugify } from '../utils/slugify';
import type { DocEntry } from '../utils/buildDocsManifest';

export interface FaqViewProps {
  readonly className?: string;
  /** FAQ-section entries (e.g. `manifest.filter((e) => e.section === 'faq')`). */
  readonly entries: readonly DocEntry[];
}

/**
 * Render FAQ entries as grouped accordions: each entry's `title` is the question
 * (trigger) and its Markdown body is the answer. Items carry `id={slug}` so they
 * are deep-linkable via `#<slug>`.
 *
 * @public
 */
export const FaqView = (props: FaqViewProps): React.ReactElement => {
  const { className, entries } = props;

  // Hooks

  // Setup
  const groups = groupFaqEntries(entries);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-col gap-8', className)}
      data-testid="FaqView"
    >
      {groups.map((group) => (
        <section
          className="scroll-mt-24"
          id={slugify(group.label)}
          key={group.label}
        >
          <h2 className="mb-2 text-lg">{formatGroupLabel(group.label)}</h2>
          <Accordion collapsible={true} type="single">
            {group.entries.map((entry) => (
              <AccordionItem
                id={entry.slug}
                key={entry.slug}
                value={entry.slug}
              >
                <AccordionTrigger className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  {entry.title}
                </AccordionTrigger>
                <AccordionContent>
                  <MarkdownRenderer source={entry.content} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ))}
    </div>
  );
};
