import * as React from 'react';
import classnames from 'classnames';
import { Card } from '@openthrottle/react-router-shadcn';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { DatabaseIcon } from '@phosphor-icons/react/dist/ssr/Database';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { LockIcon } from '@phosphor-icons/react/dist/ssr/Lock';

interface HomeContextProps {
  className?: string;
}

export const HomeContext = (props: HomeContextProps): React.ReactElement => {
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
      data-testid="HomeContext"
      id="features"
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold mb-4">
            All the information you need, in one place
          </h2>
          <p className="text-lg text-muted-foreground mx-auto max-w-2xl">
            Pull together everything that matters: GitHub issues, commits, PRs,
            Jira tickets, design docs, and project plans. Transform fragmented
            information into searchable, queryable knowledge living next to your
            code.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border p-6 hover:border-accent/50 transition">
            <GithubLogoIcon className="w-6 h-6 text-accent mb-4" />
            <h3 className="font-semibold mb-2">GitHub Integration</h3>
            <p className="text-sm text-muted-foreground">
              Issues, PRs, commits, and merge history contextualized
            </p>
          </Card>
          <Card className="bg-card border-border p-6 hover:border-accent/50 transition">
            <DatabaseIcon className="w-6 h-6 text-accent mb-4" />
            <h3 className="font-semibold mb-2">Store Plans Locally</h3>
            <p className="text-sm text-muted-foreground">
              Keep your tasks and plans beside the code, always in sync
            </p>
          </Card>
          <Card className="bg-card border-border p-6 hover:border-accent/50 transition">
            <MagnifyingGlassIcon className="w-6 h-6 text-accent mb-4" />
            <h3 className="font-semibold mb-2">Full Search</h3>
            <p className="text-sm text-muted-foreground">
              Search across commits, issues, docs, and code at light speed
            </p>
          </Card>
          <Card className="bg-card border-border p-6 hover:border-accent/50 transition">
            <LockIcon className="w-6 h-6 text-accent mb-4" />
            <h3 className="font-semibold mb-2">Complete Control</h3>
            <p className="text-sm text-muted-foreground">
              Own your data. Customize everything. No lock-in.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};
