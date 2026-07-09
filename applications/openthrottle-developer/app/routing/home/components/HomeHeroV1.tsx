import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@openthrottle/react-router-shadcn';
import { CodeIcon } from 'lucide-react';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { Link } from 'react-router';
import { OPENTHROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';

export interface HomeHeroV1Props {
  className?: string;
}

export const HomeHeroV1 = (props: HomeHeroV1Props): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section className={clsx(className)} data-testid="HomeHeroV1">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-sans text-5xl leading-tight font-normal sm:text-6xl lg:text-7xl">
            Stop <span className="text-highlight-red font-black">losing</span>{' '}
            the <span className="text-accent font-black">plan</span>
            <br />
            in{' '}
            <span
              className="font-thin tracking-tighter text-current/60"
              style={{
                marginLeft: '-10px',
                marginRight: '-8px',
                verticalAlign: 'top',
                zoom: 0.98,
              }}
            >
              between
            </span>{' '}
            tools.
          </h1>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              asChild={true}
              className="bg-accent hover:bg-accent/90 flex cursor-pointer items-center gap-4 rounded-xl p-4 text-white"
              size="lg"
            >
              <Link target="_blank" to={OPENTHROTTLE_GITHUB_URL}>
                Try Now
                <CodeIcon size={20} />
              </Link>
            </Button>

            <Button
              asChild={true}
              className="border-border hover:bg-secondary flex cursor-pointer items-center gap-4 rounded-xl bg-transparent p-4 text-white"
              size="lg"
              variant="outline"
            >
              <Link target="_blank" to={OPENTHROTTLE_GITHUB_URL}>
                View on GitHub
                <GithubLogoIcon size={20} weight="fill" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
