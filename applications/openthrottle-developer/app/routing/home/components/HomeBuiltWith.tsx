import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { technologies } from '~/routing/home/data/technology';

/**
 * @deprecated Temporarily removed from home index; restore when re-enabling commented JSX in `app/routes/_index.tsx`.
 */
export interface HomeBuiltWithProps {
  className?: string;
}

export const HomeBuiltWith = (
  props: HomeBuiltWithProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('p-4', className)} data-testid="HomeBuiltWith">
      <h2 className="text-center text-2xl">
        Everything is built on OpenSource work
      </h2>
      {technologies.map((technology) => {
        return (
          <Link target="_blank" to={technology.url}>
            <img alt={technology.name} src={technology.image} />
          </Link>
        );
      })}
    </div>
  );
};
