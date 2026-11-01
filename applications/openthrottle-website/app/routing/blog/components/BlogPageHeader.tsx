import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface BlogPageHeaderProps {
  readonly className?: string;
  readonly description: string | null | undefined;
  /** Small label above the heading, e.g. `Tag`. */
  readonly eyebrow: string | null | undefined;
  readonly heading: string;
}

export const BlogPageHeader = (
  props: BlogPageHeaderProps,
): React.ReactElement => {
  const { className, description, eyebrow, heading } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <header
      className={cn('flex flex-col gap-3', className)}
      data-testid="BlogPageHeader"
    >
      {eyebrow ? (
        <p className="text-accent text-xs font-semibold tracking-[0.08em] uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-[clamp(1.75rem,4vw,2.6rem)] leading-tight">
        {heading}
      </h1>
      {description ? (
        <p className="text-muted-foreground max-w-2xl text-lg">{description}</p>
      ) : null}
    </header>
  );
};
