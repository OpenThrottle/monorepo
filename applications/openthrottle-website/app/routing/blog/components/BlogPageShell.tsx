import clsx from 'clsx';
import * as React from 'react';

import { GlobalFooter } from '~/global/components/GlobalFooter';

export interface BlogPageShellProps {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export const BlogPageShell = (
  props: BlogPageShellProps,
): React.ReactElement => {
  const { children, className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <main
        className={clsx(
          'mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8',
          className,
        )}
        data-testid="BlogPageShell"
      >
        {children}
      </main>
      <GlobalFooter />
    </>
  );
};
