import * as React from 'react';
import { SpeedometerIcon } from '@phosphor-icons/react/dist/ssr/Speedometer';

interface GlobalFooterProps {}

export const GlobalFooter = (_props: GlobalFooterProps): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <footer
      className="border-t border-border bg-card py-12 px-4 sm:px-6 lg:px-8"
      data-testid="GlobalFooter"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-8 justify-center md:justify-start">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <SpeedometerIcon className="w-5 h-5 text-accent" />
            <span className="font-bold">OpenThrottle</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Context-driven AI tools and workflows for the Agentic Developer.
          </p>
        </div>

        <div className="flex-1 text-center justify-center text-sm text-muted-foreground">
          <p>
            Built by engineers.{' '}
            <b className="text-foreground/80">Open source</b>. No lock-in.
          </p>
        </div>
      </div>
    </footer>
  );
};
