import * as React from 'react';
import classnames from 'classnames';

export interface HomeComingSoonProps {
  className?: string;
}

export const HomeComingSoon = (props: HomeComingSoonProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={classnames(
        'relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden',
        className,
      )}
      data-testid="HomeComingSoon"
    >
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="text-foreground"></span>{' '}
            <span className="bg-linear-to-r from-accent to-accent/70 bg-clip-text text-transparent">
              Building...
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            We're building something great for you. Check back later for
            updates.
          </p>
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute top-40 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />
    </section>
  );
};
