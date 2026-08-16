import clsx from 'clsx';
import * as React from 'react';
import { LANDING_PROMISE } from '~/routing/home/data/data.landing';

export interface LandingPromiseProps {
  className?: string;
}

export const LandingPromise = (
  props: LandingPromiseProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const { kicker, lede, title } = LANDING_PROMISE;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={clsx(
        'bg-background border-border justify-center border-y px-6 py-[clamp(3.5rem,8vw,6rem)]',
        'flex min-h-svh items-center',
        'snap-start',
        className,
      )}
      data-testid="LandingPromise"
      id="why"
    >
      <div className="landing-reveal mx-auto grid w-[min(68rem,100%)] gap-8 md:grid-cols-2 md:items-end md:gap-16">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-[0.08em] text-(--brand) uppercase">
            {kicker}
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.6rem)]">{title}</h2>
        </div>
        <p className="text-muted-foreground max-w-[42ch] text-[1.0625rem]">
          {lede}
        </p>
      </div>
    </section>
  );
};
