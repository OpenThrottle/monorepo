import * as React from 'react';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';
import { GLOBAL_FOOTER_SPONSOR_COPY } from '../data/data.copy';

export interface GlobalFooterProps {}

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
      className="border-border bg-card border-t px-4 py-12 sm:px-6 lg:px-8"
      data-testid="GlobalFooter"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 md:justify-start">
        <div className="col-span-2">
          <OpenThrottleLogo className="text-lg" name="AI" />
          <p className="text-muted-foreground mt-2 text-sm">
            Context-driven AI tools and workflows for the Agentic Developer.
          </p>
        </div>

        <div className="text-muted-foreground flex-1 justify-center text-center text-sm">
          <p>
            Built by engineers.{' '}
            <b className="text-foreground/80">Open source</b>. No lock-in.
          </p>
          <p className="mt-2">
            {GLOBAL_FOOTER_SPONSOR_COPY.prompt}{' '}
            <a
              className="text-foreground/80 hover:text-foreground underline underline-offset-4"
              href={GLOBAL_FOOTER_SPONSOR_COPY.href}
              rel="noreferrer"
              target="_blank"
            >
              {GLOBAL_FOOTER_SPONSOR_COPY.label}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
