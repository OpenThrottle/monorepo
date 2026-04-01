import * as React from 'react';
import classnames from 'classnames';
import { Link } from 'react-router';
import { SpeedometerIcon } from '@phosphor-icons/react/dist/ssr/Speedometer';

export interface OpenThrottleLogoProps {
  readonly className?: string;
  readonly name?: string;
  readonly to?: string;
}

export const OpenThrottleLogo = (props: OpenThrottleLogoProps) => {
  const { className, name, to } = props;

  // Hooks

  // Setup
  const containerClasses = classnames(
    'flex items-center gap-2 px-2 py-2 text-sidebar-foreground',
    className,
  );

  // Handlers

  // Markup
  const logoText = (
    <>
      <span className="font-black text-current">OpenThrottle</span>
      {name ? (
        <>
          <span className="text-muted-foreground/50 font-extralight">|</span>
          <span className="text-highlight font-normal">{name}</span>
        </>
      ) : null}
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (!to) {
    return (
      <div className={containerClasses}>
        <SpeedometerIcon className="shrink-0 text-accent" />
        <div className="flex gap-2" data-testid="OpenThrottleLogo">
          {logoText}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <SpeedometerIcon className="shrink-0 text-accent" />
      <Link
        className="truncate tracking-wide group-data-[collapsible=icon]:hidden flex gap-2"
        to={to}
      >
        {logoText}
      </Link>
    </div>
  );
};
