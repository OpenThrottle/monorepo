import * as React from 'react';
import clsx from 'clsx';
import { LucideIcon } from 'lucide-react';

export interface GlobalHeadingProps extends React.PropsWithChildren {
  className?: string;
  heading?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  title: string;
}

export const GlobalHeading = (
  props: GlobalHeadingProps,
): React.ReactElement => {
  const { children, className, heading = 'h2', icon, title } = props;

  // Hooks

  // Setup
  const Heading = heading;
  const Icon = icon;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-wrap gap-2">
      <Heading
        className={clsx(
          // 'text-5xl text-center my-20 sm:text-xl lg:text-3xl font-bold',
          'flex flex-1 items-center gap-4',
          className,
        )}
        data-testid="GlobalHeading"
      >
        {Icon ? <Icon className="text-muted-foreground size-4" /> : null}
        {title}
      </Heading>
      {children && children}
    </div>
  );
};
