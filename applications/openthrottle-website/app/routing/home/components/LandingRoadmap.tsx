import { Badge, cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { LANDING_ROADMAP } from '~/routing/home/data/data.landing';

export interface LandingRoadmapProps {
  className?: string;
}

export const LandingRoadmap = (
  props: LandingRoadmapProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const { items, kicker, lede, statusLabels, title } = LANDING_ROADMAP;

  // Handlers

  // Markup

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
      data-testid="LandingRoadmap"
      id="roadmap"
    >
      <div className="mx-auto w-[min(68rem,100%)]">
        <div>
          <p className="landing-reveal mb-3 text-xs font-semibold tracking-[0.08em] text-(--brand) uppercase">
            {kicker}
          </p>
          <h2 className="landing-reveal text-[clamp(1.75rem,4vw,2.6rem)] leading-tight tracking-[-0.035em]">
            {title}
          </h2>
          <p className="landing-reveal text-muted-foreground mt-3">{lede}</p>
        </div>

        <ul className="landing-reveal mt-10 grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {items.map((item) => (
            <li className="border-t pt-4" key={item.id}>
              <Badge
                color={item.status === 'in-flight' ? 'amber' : 'slate'}
                size="xs"
              >
                {statusLabels[item.status]}
              </Badge>
              <h3 className="mt-3 mb-2 text-lg tracking-[-0.02em]">
                {item.name}
              </h3>
              <p className="text-muted-foreground text-[0.975rem]">
                {item.oneLiner}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
