import * as React from 'react';
import { OpenThrottleClipboard } from './OpenThrottleClipboard';
import { ClipboardIcon, DollarSignIcon, GitBranchIcon } from 'lucide-react';
import { Button } from '@openthrottle/react-router-shadcn';

export interface OpenThrottleGetStartedProps {
  // className?: string;
}

export const OpenThrottleGetStarted = (
  _props: OpenThrottleGetStartedProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup
  const command = `git clone https://github.com/openthrottle/monorepo.git`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="bg-card rounded-lg border border-card-border p-4 md:p-8 w-full max-w-2xl mx-auto my-8 lg:my-12">
      <h2 className="text-2xl my-4 text-center">Get Started</h2>
      <p className="mb-8 text-muted-foreground text-sm max-w-2xl mx-auto">
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Modi soluta
        reiciendis error maxime, iusto facere ipsam tempore molestiae odio
        doloremque nostrum ex mollitia! Assumenda hic neque maxime quaerat, quam
        reprehenderit.
      </p>
      <div className="flex relative justify-between items-center rounded-xl border bg-primary-foreground">
        <DollarSignIcon
          className="absolute pointer-events-none left-3 text-accent"
          size={12}
        />
        <OpenThrottleClipboard
          className="text-xs p-2 px-4 pl-8 text-left w-full"
          label={command}
          text={command}
        />
        <ClipboardIcon
          className="absolute pointer-events-none right-4"
          size={12}
        />
      </div>

      <div className="flex items-center justify-center mt-8">
        <Button size="sm" variant="brand">
          View on GitHub
          <GitBranchIcon size={20} />
        </Button>
      </div>
    </div>
  );
};
