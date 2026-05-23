import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';

/** @deprecated Home section kept for intentional rollback; wire from `app/routes/_index.tsx` when needed. */
export interface HomeOpenSourceProps {
  className?: string;
}

export const HomeOpenSource = (
  _props: HomeOpenSourceProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border"
      data-testid="HomeOpenSource"
      id="open-source"
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">Open Source, Free, Forever</h2>
        <p className="text-lg text-muted-foreground mb-8">
          We use the best of the best open-source tools. No proprietary lock-in.
          Everything is free to use.
        </p>
        <Button
          className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
          size="lg"
        >
          Explore GitHub
          {/* <ArrowRight className="w-4 h-4" /> */}
        </Button>
      </div>
    </section>
  );
};
