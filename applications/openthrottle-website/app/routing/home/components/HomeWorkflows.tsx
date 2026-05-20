import * as React from 'react';
import classnames from 'classnames';

interface HomeWorkflowsProps {
  className?: string;
}

export const HomeWorkflows = (props: HomeWorkflowsProps) => {
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
        'border-t border-border bg-card/30',
        'py-20 px-4 sm:px-6 lg:px-8',
        className,
      )}
      data-testid="HomeWorkflows"
      id="how-it-works"
    >
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">Feedback-Driven Development</h2>
        <p className="text-lg text-muted-foreground mx-auto mb-12 max-w-2xl">
          Built on the principle of rapid feedback loops. Gather context, run
          AI-powered analysis, take action, iterate. All wired into your IDE and
          running on scalable queues.
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="relative">
            <div className="bg-muted-foreground/10 rounded-lg p-8 h-full flex flex-col justify-between border border-muted-foreground/20">
              <div>
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                  <span className="text-accent font-bold">1</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Gather</h3>
                <p className="text-muted-foreground">
                  Aggregate all context: commits, PRs, issues, docs, decisions
                </p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-muted-foreground/10 rounded-lg p-8 h-full flex flex-col justify-between border border-muted-foreground/20">
              <div>
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                  <span className="text-accent font-bold">2</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Analyze</h3>
                <p className="text-muted-foreground">
                  AI runs your custom feedback loops on the aggregated context
                </p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="bg-muted-foreground/10 rounded-lg p-8 h-full flex flex-col justify-between border border-muted-foreground/20">
              <div>
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                  <span className="text-accent font-bold">3</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Act & Iterate</h3>
                <p className="text-muted-foreground">
                  Results delivered to your IDE. Loop tightens with each
                  iteration
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
