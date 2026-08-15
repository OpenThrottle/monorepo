import * as React from 'react';
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
      className={`bg-background px-6 py-[clamp(3.5rem,8vw,6rem)] ${className ?? ''}`}
      data-testid="LandingFlow"
      id="how"
    >
      <div className="mx-auto w-[min(68rem,100%)]">
        <p className="landing-reveal mb-3 text-xs font-semibold tracking-[0.08em] text-[var(--brand)] uppercase">
          {kicker}
        </p>
        <h2 className="landing-reveal max-w-[18ch] text-[clamp(1.75rem,4vw,2.6rem)] leading-tight font-bold tracking-[-0.035em]">
          {title}
        </h2>
        <p className="landing-reveal text-muted-foreground mt-3 max-w-[42ch]">
          {lede}
        </p>

        <ol className="landing-reveal mt-10 grid gap-0 md:grid-cols-4 md:gap-6">
          {steps.map((step, index) => (
            <li
              className="border-foreground/15 md:border-foreground border-t py-5 md:border-t-2 md:pt-6"
              key={step.title}
            >
              <span className="mb-3 block font-mono text-sm font-bold tracking-[0.06em] text-[var(--brand)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mb-2 text-lg font-bold tracking-[-0.02em]">
                {step.title}
              </h3>
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
