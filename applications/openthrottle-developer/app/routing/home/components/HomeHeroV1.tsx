import * as React from 'react';
import classnames from 'classnames';
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
    <section className={classnames(className)} data-testid="HomeHeroV1">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal font-sans leading-tight">
            Stop <span className="text-highlight-red font-black">losing</span>{' '}
            the <span className="text-accent font-black">plan</span>
            <br />
            in{' '}
            <span
              className="tracking-tighter font-thin text-current/60"
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

          <div className="flex flex-col justify-center sm:flex-row gap-4 mt-8">
            <Button
              asChild={true}
              className="bg-accent hover:bg-accent/90 flex items-center gap-4 p-4 rounded-xl text-white cursor-pointer"
              size="lg"
            >
              <Link target="_blank" to={OPENTHROTTLE_GITHUB_URL}>
                Try Now
                <CodeIcon size={20} />
              </Link>
            </Button>

            <Button
              asChild={true}
              className="border-border flex items-center gap-4 hover:bg-secondary p-4 rounded-xl text-white cursor-pointer bg-transparent"
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
