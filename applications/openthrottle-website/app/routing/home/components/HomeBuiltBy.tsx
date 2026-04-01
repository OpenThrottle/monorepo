import * as React from 'react';
import classnames from 'classnames';
import { SpeedometerIcon } from '@phosphor-icons/react/dist/ssr/Speedometer';
import { CodeIcon } from '@phosphor-icons/react/dist/ssr/Code';
import { LightningIcon } from '@phosphor-icons/react/dist/ssr/Lightning';

export interface HomeBuiltByProps {
  className?: string;
}

export const HomeBuiltBy = (props: HomeBuiltByProps) => {
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
        'border-t border-border',
        'py-20 px-4 sm:px-6 lg:px-8',
        className,
      )}
      data-testid="HomeBuiltBy"
      id="built-by-engineers"
    >
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold mb-12 text-center">
          Built By Engineers, For Engineers
        </h2>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="flex-1 justify-center flex flex-col h-full">
            <div className="space-y-6">
              <div>
                <h3 className="flex items-center gap-3 font-semibold text-lg mb-2">
                  <LightningIcon className="w-5 h-5 text-accent" />
                  Open Source Foundation
                </h3>
                <p className="text-muted-foreground">
                  Built entirely on the best open-source tools. Free.
                  Customizable. Transparent.
                </p>
              </div>
              <div>
                <h3 className="flex items-center gap-3 font-semibold text-lg mb-2">
                  <CodeIcon className="w-5 h-5 text-accent" />
                  IDE Integration
                </h3>
                <p className="text-muted-foreground">
                  Tight integration with your development environment. No
                  context switching tabs.
                </p>
              </div>
              <div>
                <h3 className="flex items-center gap-3 font-semibold text-lg mb-2">
                  <SpeedometerIcon className="w-5 h-5 text-accent" />
                  Layered on Top
                </h3>
                <p className="text-muted-foreground">
                  Lives alongside your existing org infrastructure. No
                  migrations. No disruptions.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-8">
            <div className="space-y-4 font-mono text-sm">
              <div className="text-accent">
                {'>'} Context gathered from 5 sources
              </div>
              <div className="text-muted-foreground ml-4">
                → GitHub: 23 commits, 5 PRs, 12 issues
              </div>
              <div className="text-muted-foreground ml-4">
                → Local: 47 tasks, 8 docs
              </div>
              <div className="text-muted-foreground ml-4">
                → Jira: 3 epics, 12 stories
              </div>
              <div className="my-4 border-t border-border" />
              <div className="text-accent">{'>'} Ralph Loop executing</div>
              <div className="text-muted-foreground ml-4">
                → Analyzing impact of PR #847
              </div>
              <div className="text-muted-foreground ml-4">
                → Cross-referencing related tasks
              </div>
              <div className="text-muted-foreground ml-4">
                → Generating recommendations
              </div>
              <div className="my-4 border-t border-border" />
              <div className="text-accent">{'>'} Ready in IDE</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
