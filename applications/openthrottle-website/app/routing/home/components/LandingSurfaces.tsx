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
      className={`landing-ink px-6 py-[clamp(3.5rem,8vw,6rem)] ${className ?? ''}`}
      data-testid="LandingSurfaces"
      id="surfaces"
    >
      <div className="mx-auto w-[min(68rem,100%)]">
        <p className="landing-reveal landing-ink-kicker mb-3 text-xs font-semibold tracking-[0.08em] uppercase">
          {kicker}
        </p>
        <h2 className="landing-reveal max-w-[18ch] text-[clamp(1.75rem,4vw,2.6rem)] leading-tight font-bold tracking-[-0.035em]">
          {title}
        </h2>
        <p className="landing-reveal landing-ink-muted mt-3 max-w-[42ch]">
          {lede}
        </p>

        <div className="landing-reveal mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
          {cards.map((card) => (
            <article
              className="landing-ink-line border-t pt-5"
              key={card.title}
            >
              <h3 className="mb-2 text-xl font-bold tracking-[-0.02em]">
                {card.title}
              </h3>
              <p className="landing-ink-muted text-[0.975rem]">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
