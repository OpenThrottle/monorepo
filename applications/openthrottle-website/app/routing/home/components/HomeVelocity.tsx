import * as React from 'react';
import { Card } from '@openthrottle/react-router-shadcn';

export interface HomeVelocityProps {}

export const HomeVelocity = (_props: HomeVelocityProps) => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border bg-card/30"
      data-testid="HomeVelocity"
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold mb-8 text-center">
          10x to 100x Velocity
        </h2>
        <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
          Context switching kills productivity. When you have all context
          instantly available, and AI-powered loops accelerate decision-making,
          the math is simple: you move faster.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-background border-border p-6">
            <div className="text-3xl font-bold text-accent mb-2">10x</div>
            <p className="text-muted-foreground">
              Code review speed with full context
            </p>
          </Card>
          <Card className="bg-background border-border p-6">
            <div className="text-3xl font-bold text-accent mb-2">100x</div>
            <p className="text-muted-foreground">
              Feature shipping when AI loops handle discovery
            </p>
          </Card>
          <Card className="bg-background border-border p-6">
            <div className="text-3xl font-bold text-accent mb-2">∞</div>
            <p className="text-muted-foreground">
              Control remains with you—fully customizable
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};
