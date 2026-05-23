import * as React from 'react';
import classnames from 'classnames';

/** @deprecated Alternate home hero kept for intentional rollback; wire from `app/routes/_index.tsx` when needed. */
export interface HomeHeroV3Props {
  className?: string;
}

export const HomeHeroV3 = (props: HomeHeroV3Props): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="HomeHeroV3">
      <h2>HomeHeroV3</h2>
    </div>
  );
};
