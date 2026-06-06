import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { ClipboardIcon, DollarSignIcon } from 'lucide-react';
import { getRandomIntroduction } from '../data/data.introductions';
import { Link } from 'react-router';
import { OPEN_THROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
import { OpenThrottleClipboard } from './OpenThrottleClipboard';
import { OpenThrottleLogo } from './OpenThrottleLogo';

export interface OpenThrottleProductGetStartedProps {
  introduction?: string;
}

export const OpenThrottleProductGetStarted = (
  props: OpenThrottleProductGetStartedProps,
): React.ReactElement => {
  const { introduction: introductionProp } = props;

  // Hooks
  const [introduction] = React.useState(
    () => introductionProp ?? getRandomIntroduction(),
  );

  // Setup
  const command = `git clone https://github.com/openthrottle/monorepo.git`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div className="flex w-auto items-center gap-2 justify-start mb-4">
        <OpenThrottleLogo className="text-xl" />
        <span className="text-muted-foreground/50 font-extralight">
          |&nbsp;
        </span>
        <span className="text-lg font-extralight text-highlight">AI</span>
      </div>

      <div className="shimmer-border max-w-3xl mx-auto">
        <div className="bg-card p-4 md:p-8 flex flex-col gap-4 lg:gap-8">
          <p className="text-sm text-muted-foreground">{introduction}</p>
          <div className="flex items-center justify-center gap-4">
            <div className="border bg-primary-foreground flex flex-1 items-center relative rounded-xl">
              <DollarSignIcon
                className="absolute pointer-events-none left-3 text-accent"
                size={12}
              />
              <OpenThrottleClipboard
                className="text-xs py-4 pl-8 pr-12 text-left opacity-60 hover:opacity-100 transition-opacity w-full"
                label={command}
                text={command}
              />
              <ClipboardIcon
                className="absolute pointer-events-none right-4"
                size={12}
              />
            </div>

            <Link target="_blank" to={OPEN_THROTTLE_GITHUB_URL}>
              <Button className="text-xs" variant="brand">
                View on GitHub
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};
