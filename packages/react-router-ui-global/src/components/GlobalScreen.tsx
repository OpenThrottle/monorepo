import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import { OPENTHROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';

export interface GlobalScreenProps extends React.PropsWithChildren<
  React.HTMLAttributes<HTMLDivElement>
> {
  readonly beta?: boolean;
  readonly className?: string;
}

export const GlobalScreen = (props: GlobalScreenProps): React.ReactElement => {
  const {
    beta = false,
    children,
    className = 'flex flex-col p-4 md:p-8 lg:p-12 gap-4 md:gap-8 lg:gap-12 max-w-5xl-- h-full w-full',
    // className = 'flex flex-col p-4 md:p-8 lg:p-12 gap-4 md:gap-8 lg:gap-12 max-w-7xl mx-auto h-full w-full',
    ...rest
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      {beta ? (
        <div
          className={clsx(
            'bg-accent/60 text-foreground',
            'px-4 py-4 md:px-8 lg:px-12',
            'sticky top-[3.3rem] z-10',
          )}
        >
          <p className="text-sm">
            <span className="font-semibold">Beta:</span> This route is a beta
            feature and may not function as expected. Please report any issues
            found using{' '}
            <Link
              className="hover:text-background underline underline-offset-4 transition-colors"
              target="_blank"
              to={`${OPENTHROTTLE_GITHUB_URL}/monorepo/issues/new/choose`}
            >
              GitHub
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className={className} {...rest}>
        {children}
      </div>
    </>
  );
};
