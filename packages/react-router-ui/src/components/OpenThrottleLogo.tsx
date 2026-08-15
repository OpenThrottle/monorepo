import * as React from 'react';
import { cn } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { SpeedometerIcon } from '@phosphor-icons/react/dist/ssr/Speedometer';

export interface OpenThrottleLogoProps {
  readonly className?: string;
  readonly name?: string;
  readonly to?: string;
}

export const OpenThrottleLogo = (
  props: OpenThrottleLogoProps,
): React.ReactElement => {
  const { className, name, to } = props;

  // Hooks

  // Setup
  const containerClasses = cn(
    'font-sans flex items-center gap-2 px-2 py-2 text-sidebar-foreground h-10',
    className,
  );

  // Handlers

  // Markup
  const logoText = (
    <>
      <span className="font-black text-current">
        Open<span className="-text-accent pl-0.5">Throttle</span>
      </span>
      {name ? (
        <>
          <span className="text-muted-foreground/50 font-extralight">|</span>
          <span className="text-accent font-semibold">{name}</span>
        </>
      ) : null}
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (!to) {
    return (
      <div className={containerClasses}>
        <SpeedometerIcon className="text-accent shrink-0" />
        <div className="flex gap-2" data-testid="OpenThrottleLogo">
          {logoText}
        </div>
      </div>
    );
  }

  return (
    <Link className={containerClasses} to={to}>
      <SpeedometerIcon className="text-accent shrink-0" />
      <div className="flex gap-2 truncate tracking-wide group-data-[collapsible=icon]:hidden">
        {logoText}
      </div>
    </Link>
  );
};
