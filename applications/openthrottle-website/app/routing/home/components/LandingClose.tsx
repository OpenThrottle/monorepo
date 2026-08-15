import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { LANDING_CLOSE } from '~/routing/home/data/data.landing';
import { HeroSoundArcs } from './HeroSoundArcs';

export interface LandingCloseProps {
  className?: string;
  /** Optional lede override (e.g. the loader's rotating introduction). */
  introduction?: string;
  /** owner/name repo slug used to build the clone CTA (e.g. from the loader). */
  repo?: string;
}

export const LandingClose = (props: LandingCloseProps): React.ReactElement => {
  const { className, introduction, repo } = props;
  const { code, ctas, kicker, lede, title } = LANDING_CLOSE;

  // Hooks

  // Setup
  const cloneHref = repo ? `https://github.com/${repo}` : ctas.primary.href;
  const codeLineClass: Record<string, string> = {
    command: 'landing-code-cmd',
    comment: 'landing-code-cmt',
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <section
        className={`landing-close-ground relative px-6 py-[clamp(3.5rem,8vw,6rem)] ${className ?? ''}`}
        data-testid="LandingClose"
        id="start"
      >
        <div className="absolute inset-0 z-0">
          <HeroSoundArcs distributionEnd={-1} distributionStart={1} n={21} />
        </div>

        <div className="landing-reveal z-10 mx-auto grid w-[min(68rem,100%)] gap-6 md:grid-cols-[1.4fr_1fr] md:items-center md:gap-12">
          <div className="z-10">
            <div>
              <p className="mb-3 text-xs text-(--brand) uppercase">{kicker}</p>
              <h2 className="text-[clamp(1.75rem,4vw,2.6rem)]">{title}</h2>
              <p className="text-muted-foreground mt-3 mb-5">
                {introduction ?? lede}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild={true} variant="default">
                <a href={cloneHref} rel="noreferrer" target="_blank">
                  {ctas.primary.label}
                </a>
              </Button>
              <Button asChild={true} variant="outline">
                <a href={ctas.secondary.href} rel="noreferrer" target="_blank">
                  {ctas.secondary.label}
                </a>
              </Button>
            </div>
          </div>

          <pre className="landing-code-block z-10 p-5" tabIndex={0}>
            <code>
              {code.map((line, index) => (
                <span
                  className={`block ${codeLineClass[line.kind] ?? ''}`}
                  key={index}
                >
                  {line.text || ' '}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </section>
    </>
  );
};
