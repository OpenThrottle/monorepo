import { Badge, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { LANDING_FEATURES } from '~/routing/home/data/landing';

export interface LandingFeaturesProps {
  className?: string;
}

export const LandingFeatures = (
  props: LandingFeaturesProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const { cards, kicker, lede, previewLabel, title } = LANDING_FEATURES;

  // Handlers

  // Markup
  const previewBadge = (
    <Badge color="violet" size="xs">
      {previewLabel}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={cn(
        'bg-background border-border justify-center border-y px-6 py-[clamp(3.5rem,8vw,6rem)]',
        'flex min-h-svh items-center',
        'snap-start',
        className,
      )}
      data-testid="LandingFeatures"
      id="features"
    >
      <div className="mx-auto w-[min(68rem,100%)]">
        <div>
          <p className="landing-reveal text-accent mb-3 text-xs font-semibold tracking-[0.08em] uppercase">
            {kicker}
          </p>
          <h2 className="landing-reveal text-[clamp(1.75rem,4vw,2.6rem)]">
            {title}
          </h2>
          <p className="landing-reveal text-muted-foreground mt-3">{lede}</p>
        </div>

        <div className="landing-reveal mt-10 grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {cards.map((card) => (
            <article
              className="landing-ink-line border-t pt-4"
              key={card.title}
            >
              <h3 className="my-4 flex items-center gap-2 text-xl">
                <span>{card.title}</span>
                {card.isPreview ? previewBadge : null}
              </h3>
              <p className="text-muted-foreground text-[0.975rem]">
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
