import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { HeroDotMesh } from './HeroDotMesh';
import { LANDING_HERO } from '~/routing/home/data/data.landing';
import { LandingNav } from './LandingNav';
import { Link } from 'react-router';
import { useRotatingHeadline } from '~/routing/home/hooks/useRotatingHeadline';

export interface LandingHeroProps {
  /**
   * Auto-advance delay in ms. `0` disables autoplay (click still advances).
   * Defaults to `LANDING_HERO.headlineIntervalMs`.
   */
  headlineIntervalMs?: number;
  /** Optional lede override (e.g. the loader's rotating introduction). */
  lede?: string;
}

interface LandingHeroHeadlineStyle extends React.CSSProperties {
  readonly '--landing-headline-crossfade': string;
}

export const LandingHero = (props: LandingHeroProps): React.ReactElement => {
  const {
    headlineIntervalMs = LANDING_HERO.headlineIntervalMs,
    lede: ledeProp,
  } = props;

  // Hooks
  const { advance, headline, incomingVisible, outgoing } = useRotatingHeadline({
    crossfadeMs: LANDING_HERO.headlineCrossfadeMs,
    intervalMs: headlineIntervalMs,
    items: LANDING_HERO.headlines,
  });

  // Setup
  const { ctas, lede } = LANDING_HERO;
  const headlineButtonStyle: LandingHeroHeadlineStyle = {
    '--landing-headline-crossfade': `${LANDING_HERO.headlineCrossfadeMs}ms`,
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label="OpenThrottle"
      className="landing-hero-ground relative grid min-h-svh items-center justify-center overflow-hidden p-4 text-white md:p-0"
      data-testid="LandingHero"
      id="top"
    >
      <LandingNav />
      <HeroDotMesh />

      <div className="relative mx-auto max-w-3xl items-center justify-center">
        <h1 className="mb-8 text-[clamp(1.75rem,4vw,2.6rem)]">
          <button
            className="grid w-full cursor-pointer bg-transparent p-0 text-left font-[inherit] text-inherit"
            onClick={advance}
            style={headlineButtonStyle}
            type="button"
          >
            {outgoing ? (
              <span
                aria-hidden="true"
                className={`landing-headline-fade col-start-1 row-start-1 ${
                  incomingVisible ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {outgoing}
              </span>
            ) : null}
            <span
              aria-live="polite"
              className={`landing-headline-fade col-start-1 row-start-1 ${
                outgoing && !incomingVisible ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {headline}
            </span>
          </button>
        </h1>
        <p className="mb-12">{ledeProp ?? lede}</p>

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
