import * as React from 'react';
import classnames from 'classnames';

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
      <div className="max-w-7xl mx-auto max-h-svh">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-normal font-sans leading-tight pb-52">
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
          {/*
          <p className="text-lg font-extralight mb-8 leading-relaxed max-w-2xl mx-auto">
            Know what you&apos;re building, what&apos;s in flight, and what
            already shipped—without digging through chat history.{' '}
            <b className="font-medium">OpenThrottle</b> is a Postgres-backed
            plans knowledge base with an MCP server: plans, tasks, and semantic
            search. Use <b className="font-medium">ask OT</b> for answers, run
            agentic work with <b className="font-medium">Ralph</b>, and watch
            progress on a dashboard built for shipping.
          </p>
          */}

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
