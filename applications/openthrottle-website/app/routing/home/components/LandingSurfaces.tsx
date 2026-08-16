import clsx from 'clsx';
import * as React from 'react';
import { LANDING_SURFACES } from '~/routing/home/data/data.landing';

export interface LandingSurfacesProps {
  className?: string;
}

export const LandingSurfaces = (
  props: LandingSurfacesProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const { cards, kicker, lede, title } = LANDING_SURFACES;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      // className={`landing-ink px-6 py-[clamp(3.5rem,8vw,6rem)] ${className ?? ''}`}
      className={clsx(
        'bg-background border-border justify-center border-y px-6 py-[clamp(3.5rem,8vw,6rem)]',
        'flex min-h-svh items-center',
        'snap-start',
        className,
      )}
      data-testid="LandingSurfaces"
      id="surfaces"
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

        <div className="landing-reveal mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
          {cards.map((card) => (
            <article
              className="landing-ink-line border-t pt-4"
              key={card.title}
            >
              <h3 className="my-4 text-xl">{card.title}</h3>
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
