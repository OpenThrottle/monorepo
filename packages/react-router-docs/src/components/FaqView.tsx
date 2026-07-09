import * as React from 'react';
import clsx from 'clsx';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@openthrottle/react-router-shadcn';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import type { DocEntry } from '../utils/buildDocsManifest';

export interface FaqViewProps {
  readonly className?: string;
  /** FAQ-section entries (e.g. `manifest.filter((e) => e.section === 'faq')`). */
  readonly entries: readonly DocEntry[];
}

interface FaqGroup {
  readonly entries: readonly DocEntry[];
  readonly label: string;
}

const groupFaqEntries = (entries: readonly DocEntry[]): readonly FaqGroup[] => {
  const groups = new Map<string, DocEntry[]>();

  for (const entry of entries) {
    const items = groups.get(entry.group) ?? [];
    items.push(entry);
    groups.set(entry.group, items);
  }

  return [...groups.entries()]
    .map(([label, grouped]): FaqGroup => ({ entries: grouped, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Render FAQ entries as grouped accordions: each entry's `title` is the question
 * (trigger) and its Markdown body is the answer. Items carry `id={slug}` so they
 * are deep-linkable via `#<slug>`.
 *
 * @publicApi
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
        <section key={group.label}>
          <h2 className="mb-2 text-lg">{group.label}</h2>
          <Accordion collapsible={true} type="single">
            {group.entries.map((entry) => (
              <AccordionItem
                id={entry.slug}
                key={entry.slug}
                value={entry.slug}
              >
                <AccordionTrigger className="text-sm">
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
