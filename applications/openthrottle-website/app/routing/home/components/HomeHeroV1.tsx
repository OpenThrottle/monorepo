import * as React from 'react';
import classnames from 'classnames';
import { Button } from '@openthrottle/react-router-shadcn';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { CodeIcon } from '@phosphor-icons/react/dist/ssr/Code';
import { Link } from 'react-router';
import {
  ENV_SOURCE,
  OPEN_THROTTLE_GITHUB_URL,
} from '@openthrottle/react-router-utils';

export interface HomeHeroV1Props {
  className?: string;
}

export const HomeHeroV1 = (props: HomeHeroV1Props) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      className={classnames(
        'py-20 sm:px-6 lg:py-52 min-h-svh',
        'flex-col flex justify-center',
        'relative overflow-hidden',
        className,
      )}
      data-testid="HomeHeroV1"
    >
      <div className="max-w-7xl mx-auto flex items-center">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="text-foreground">Context is</span>{' '}
            <span className="bg-linear-to-r from-accent to-accent/70 bg-clip-text text-transparent">
              King
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Stop context switching. Every commit, issue, PR, document, and
            decision—aggregated around your code. AI-powered feedback loops that
            move you 10x to 100x faster, without sacrificing control.
          </p>
          <div className="flex flex-col justify-center sm:flex-row gap-4">
            <Button asChild={true} size="lg" variant="default">
              <Link target="_blank" to={ENV_SOURCE.APP_URL_DEVELOPER}>
                Coming Soon
                <CodeIcon size={20} weight="regular" />
              </Link>
            </Button>

            <Button
              asChild={true}
              // className="border-border flex items-center gap-4 hover:bg-secondary p-4 rounded-xl text-white cursor-pointer bg-transparent"
              size="lg"
              variant="destructive"
            >
              <Link target="_blank" to={OPEN_THROTTLE_GITHUB_URL}>
                View on GitHub
                <GithubLogoIcon size={20} weight="fill" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute top-40 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />
    </section>
  );
};
