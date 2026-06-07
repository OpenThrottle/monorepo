import * as React from 'react';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';

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
          <OpenThrottleLogo className="text-lg" name="AI" />
          <p className="text-sm text-muted-foreground mt-2">
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
