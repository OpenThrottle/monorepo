import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';

export interface HomeMoveFasterProps {}

export const HomeMoveFaster = (_props: HomeMoveFasterProps) => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-muted-foreground/5"
      data-testid="HomeMoveFaster"
    >
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to Move Faster?</h2>
        <p className="text-xl text-muted-foreground mb-8">
          Experience context-driven development. Built by engineers. For
          engineers.
        </p>
        <Button
          asChild={true}
          className="bg-accent px-8! p-2 rounded-xl text-white hover:bg-accent/90 gap-2"
          size="default"
        >
          <Link to="/pricing">Try Now</Link>
        </Button>
      </div>
    </section>
  );
};
