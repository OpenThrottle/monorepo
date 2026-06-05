import * as React from 'react';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { ClipboardIcon } from 'lucide-react';

export interface HomeGetStartedProps {
  // className?: string;
}

export const HomeGetStarted = (
  _props: HomeGetStartedProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup
  const command = `git clone https://github.com/openthrottle/openthrottle-developer.git`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="bg-card rounded-lg border border-card-border p-4 md:p-8 w-full max-w-2xl mx-auto">
      <h2 className="text-2xl my-4 text-center">Get Started</h2>
      <p className="mb-8 text-muted-foreground text-sm max-w-2xl mx-auto">
        Lorem ipsum dolor sit amet consectetur, adipisicing elit. Modi soluta
        reiciendis error maxime, iusto facere ipsam tempore molestiae odio
        doloremque nostrum ex mollitia! Assumenda hic neque maxime quaerat, quam
        reprehenderit.
      </p>
      <div className="flex relative justify-between items-center rounded-xl border bg-primary-foreground">
        <OpenThrottleClipboard
          className="text-xs p-2 px-4  text-left w-full"
          label={command}
          text={command}
        />
        <ClipboardIcon
          className="absolute pointer-events-none right-4"
          size={12}
        />
      </div>
    </div>
  );
};
