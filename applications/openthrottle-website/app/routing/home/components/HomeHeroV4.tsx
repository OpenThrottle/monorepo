import * as React from 'react';
import classnames from 'classnames';

/** @deprecated Alternate home hero kept for intentional rollback; wire from `app/routes/_index.tsx` when needed. */
export interface HomeHeroV4Props {
  className?: string;
}

export const HomeHeroV4 = (props: HomeHeroV4Props) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="HomeHeroV4">
      <h2>HomeHeroV4</h2>
    </div>
  );
};
