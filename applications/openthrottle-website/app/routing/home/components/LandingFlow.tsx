import * as React from 'react';
import clsx from 'clsx';
import { GlobalAnimationWaves } from '@openthrottle/react-router-ui-global';
import { LANDING_FLOW } from '~/routing/home/data/data.landing';

export interface LandingFlowProps {
  className?: string;
}

export const LandingFlow = (props: LandingFlowProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const { kicker, lede, steps, title } = LANDING_FLOW;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={clsx(
        'bg-background border-border justify-center border-y px-6 py-[clamp(3.5rem,8vw,6rem)]',
        'flex min-h-svh items-center',
        'relative snap-start',
        className,
      )}
      data-testid="LandingFlow"
      id="how"
    >
      <GlobalAnimationWaves className="absolute inset-0 z-10" />
      <div className="z-20 mx-auto w-[min(68rem,100%)]">
        <div>
          <p className="landing-reveal mb-3 text-xs font-semibold tracking-[0.08em] text-(--brand) uppercase">
            {kicker}
          </p>
          <h2 className="landing-reveal text-[clamp(1.75rem,4vw,2.6rem)] leading-tight tracking-[-0.035em]">
            {title}
          </h2>
          <p className="landing-reveal text-muted-foreground mt-3">{lede}</p>
        </div>

        <ol className="landing-reveal mt-10 grid gap-0 md:grid-cols-4 md:gap-6">
          {steps.map((step, index) => (
            <li
              className="border-t py-5 md:border-t-2 md:pt-6"
              key={step.title}
            >
              <span className="mb-3 block font-mono text-sm tracking-[0.06em] text-(--brand)">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mb-2 text-lg tracking-[-0.02em]">{step.title}</h3>
              <p className="text-muted-foreground text-[0.975rem]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};
