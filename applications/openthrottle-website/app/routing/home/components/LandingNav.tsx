import * as React from 'react';
import { LANDING_NAV } from '~/routing/home/data/data.landing';
import { Link } from 'react-router';
import { OpenThrottleLogo } from '@openthrottle/react-router-ui';

export interface LandingNavProps {
  className?: string;
}

export const LandingNav = (props: LandingNavProps): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup
  const { links } = LANDING_NAV;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <header
      className={`absolute inset-x-0 top-0 z-10 flex flex-col items-center justify-between gap-4 px-6 py-5 text-[var(--landing-hero-line-strong)] sm:flex-row ${className ?? ''}`}
      data-testid="LandingNav"
    >
      <Link className="font-bold tracking-tight no-underline" to="#top">
        <OpenThrottleLogo className="text-lg text-white" name="AI" />
      </Link>

      <nav
        aria-label="Primary"
        className="flex items-center gap-5 text-sm font-medium"
      >
        {links.map((link) =>
          link.external ? (
            <a
              className="no-underline opacity-80 transition-opacity hover:text-white hover:opacity-100"
              href={link.href}
              key={link.href}
              rel="noreferrer"
              target="_blank"
            >
              {link.label}
            </a>
          ) : (
            <Link
              className="no-underline opacity-80 transition-opacity hover:text-white hover:opacity-100"
              key={link.href}
              to={link.href}
            >
              {link.label}
            </Link>
          ),
        )}
      </nav>
    </header>
  );
};
