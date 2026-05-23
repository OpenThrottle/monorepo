import * as React from 'react';
import classnames from 'classnames';

export interface HomeGetStartedProps {
  className?: string;
}

export const HomeGetStarted = (
  props: HomeGetStartedProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="HomeGetStarted">
      <h2>HomeGetStarted</h2>
    </div>
  );
};
