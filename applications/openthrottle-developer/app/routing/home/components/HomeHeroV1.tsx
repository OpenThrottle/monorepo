import * as React from 'react';
import classnames from 'classnames';

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
        'relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden',
        className,
      )}
      data-testid="HomeHeroV1"
    >
      <div className="max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
            <span className="text-foreground">Get </span>{' '}
            <span className="text-highlight">Started!</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            OpenThrottle is a plans knowledge base: a Postgres-backed app and
            MCP server that stores plans, tasks, and semantic search over them.
            It powers “ask OT,” agentic execution (Ralph), and a dashboard so
            you can see what's in progress and what shipped.
          </p>

          {/* <div className="flex flex-col justify-center sm:flex-row gap-4">
            <Button
              asChild={true}
              className="bg-accent hover:bg-accent/90 flex items-center gap-4 p-4 rounded-xl text-white cursor-pointer"
              size="lg"
            >
              <Link target="_blank" to={SITE_DEVELOPER_PORTAL_URL}>
                Try Now
                <CodeIcon size={20} weight="regular" />
              </Link>
            </Button>

            <Button
              asChild={true}
              className="border-border flex items-center gap-4 hover:bg-secondary p-4 rounded-xl text-white cursor-pointer bg-transparent"
              size="lg"
              variant="outline"
            >
              <Link target="_blank" to={SITE_GITHUB_URL}>
                View on GitHub
                <GithubLogoIcon size={20} weight="fill" />
              </Link>
            </Button>
          </div> */}
        </div>
      </div>

      {/* Decorative element */}
      <div className="absolute top-40 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />
    </section>
  );
};
