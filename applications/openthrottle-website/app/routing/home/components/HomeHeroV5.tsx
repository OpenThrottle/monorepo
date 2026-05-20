import * as React from 'react';
import classnames from 'classnames';

/** @deprecated Alternate home hero kept for intentional rollback; wire from `app/routes/_index.tsx` when needed. */
export interface HomeHeroV5Props {
  className?: string;
}

export const HomeHeroV5 = (props: HomeHeroV5Props) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="HomeHeroV5">
      <h2>HomeHeroV5</h2>
    </div>
  );
};
