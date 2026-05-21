import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import { technologies } from '~/routing/home/data/technology';

/**
 * @deprecated Temporarily removed from home index; restore when re-enabling commented JSX in `app/routes/_index.tsx`.
 */
export interface HomeBuiltWithProps {
  readonly className?: string;
}

export const HomeBuiltWith = (props: HomeBuiltWithProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('p-4', className)} data-testid="HomeBuiltWith">
      <h2 className="text-2xl text-center">
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
