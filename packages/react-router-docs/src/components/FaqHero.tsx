import * as React from 'react';
import clsx from 'clsx';
import { formatGroupLabel } from '../utils/buildDocsNav';
import type { FaqCategory } from '../utils/faqCategories';

export interface FaqHeroProps {
  readonly categories: readonly FaqCategory[];
  readonly className?: string;
  readonly description?: string;
}

/**
 * FAQ intro + "jump to category" hero. Renders a short lead paragraph and a row
 * of anchor chips linking to each category section (the ids match FaqView's
 * `<section>` anchors, via the shared slugger). Pure from its props — the route
 * gates it behind the `landing` flag.
 *
 * @public
 */
export const FaqHero = (props: FaqHeroProps): React.ReactElement => {
  const { categories, className, description } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-col gap-4', className)}
      data-testid="FaqHero"
    >
      {description !== undefined ? (
        <p className="text-muted-foreground max-w-3xl text-sm">{description}</p>
      ) : null}

      {categories.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Browse by category
          </span>
          {categories.map((category) => (
            <a
              className="bg-muted text-foreground hover:bg-accent rounded-full px-3 py-1 text-xs font-medium"
              href={`#${category.id}`}
              key={category.id}
            >
              {formatGroupLabel(category.label)}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};
