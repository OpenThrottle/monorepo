import * as React from 'react';
import classnames from 'classnames';

export interface GlobalHeadingProps {
  className?: string;
  heading: string;
}

export const GlobalHeading = (props: GlobalHeadingProps) => {
  const { className, heading } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <h1
      className={classnames(
        'text-5xl text-center my-20 sm:text-xl lg:text-3xl font-bold',
        className,
      )}
      data-testid="GlobalHeading"
    >
      <span className="bg-linear-to-r from-accent to-accent/70 bg-clip-text text-transparent">
        {heading}
      </span>
    </h1>
  );
};
