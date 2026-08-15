import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { HeroDotMesh } from './HeroDotMesh';
import { LANDING_HERO } from '~/routing/home/data/data.landing';
import { LandingNav } from './LandingNav';
import { Link } from 'react-router';
// import { HeroSoundArcs } from './HeroSoundArcs';

export interface LandingHeroProps {
  /** Optional lede override (e.g. the loader's rotating introduction). */
  lede?: string;
}

export const LandingHero = (props: LandingHeroProps): React.ReactElement => {
  const { lede: ledeProp } = props;

  // Hooks

  // Setup
  const { ctas, headline, lede, wordmark } = LANDING_HERO;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label="OpenThrottle"
      className="landing-hero-ground relative grid min-h-[100svh] items-end overflow-hidden text-[var(--landing-hero-line-strong)]"
      data-testid="LandingHero"
      id="top"
    >
      <LandingNav />

      {/* Interactive dot-lattice backdrop (replaces the static drifting grid) */}
      <HeroDotMesh />

      {/* Velocity-reactive "sound wave" arcs (replaces the static arc SVG) */}
      {/* <HeroSoundArcs /> */}

      {/* Static mono labels riding over the arcs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <svg
          className="h-full w-full object-cover"
          preserveAspectRatio="xMidYMid slice"
          role="presentation"
          viewBox="0 0 1440 900"
        >
          <g
            fill="#f3f0ea"
            fontFamily="ui-monospace, SF Mono, Menlo, monospace"
            fontSize="13"
            opacity="0.55"
          >
            <text x="980" y="620">
              plan → task → run → commit
            </text>
            <text x="980" y="644">
              Plan-Id · Task-Id · MCP
            </text>
          </g>
        </svg>
      </div>

      {/* Copy */}
      <div className="relative z-[1] w-[min(42rem,100%)] px-6 pt-26 pb-14">
        <p className="mb-5 text-[clamp(2.75rem,9vw,5.5rem)] leading-[0.92] font-extrabold tracking-[-0.045em]">
          {wordmark.lead}
          <span className="text-[var(--brand)]">{wordmark.accent}</span>
        </p>
        <h1 className="mb-3 max-w-[18ch] text-[clamp(1.45rem,3.4vw,2.15rem)] leading-tight font-bold tracking-[-0.03em]">
          {headline}
        </h1>
        <p className="mb-7 max-w-[34ch] text-[1.0625rem] text-[var(--landing-hero-line-strong)]/80">
          {ledeProp ?? lede}
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild={true} variant="brand">
            <a href={ctas.primary.href} rel="noreferrer" target="_blank">
              <span>{ctas.primary.label}</span>
              <GithubLogoIcon weight="fill" />
            </a>
          </Button>

          <Button
            asChild={true}
            className="border border-white/35 bg-transparent text-white hover:border-white hover:bg-white/5 hover:text-white"
            variant="ghost"
          >
            <Link to={ctas.secondary.href}>{ctas.secondary.label}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
