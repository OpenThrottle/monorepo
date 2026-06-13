import * as React from 'react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { ClipboardIcon, DollarSignIcon } from 'lucide-react';
import { GithubLogoIcon } from '@phosphor-icons/react/dist/ssr/GithubLogo';
import { getRandomIntroduction } from '../data/data.introductions';
import { Link } from 'react-router';
import { OPENTHROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
import { OpenThrottleClipboard } from './OpenThrottleClipboard';
import { OpenThrottleLogo } from './OpenThrottleLogo';

export interface OpenThrottleProductGetStartedProps {
  introduction?: string;
  repo: string;
  stars: string;
}

export const OpenThrottleProductGetStarted = (
  props: OpenThrottleProductGetStartedProps,
): React.ReactElement => {
  const { introduction: introductionProp, repo, stars } = props;

  // Hooks
  const [introduction] = React.useState(
    () => introductionProp ?? getRandomIntroduction(),
  );

  // Setup
  const command = `git clone https://github.com/${repo}.git`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div className="mb-4 flex w-auto items-center justify-start gap-2">
        <OpenThrottleLogo className="text-xl" />
        <span className="text-muted-foreground/50 font-extralight">
          |&nbsp;
        </span>
        <span className="text-highlight text-lg font-extralight">AI</span>
      </div>

      <div className="shimmer-border mx-auto max-w-3xl">
        <div className="bg-card flex flex-col gap-4 p-4 md:p-8 lg:gap-8">
          <p className="text-muted-foreground text-sm">{introduction}</p>
          <div className="flex items-center justify-center gap-4">
            <div className="bg-primary-foreground relative flex flex-1 items-center rounded-xl border">
              <DollarSignIcon
                className="text-accent pointer-events-none absolute left-3"
                size={12}
              />
              <OpenThrottleClipboard
                className="w-full py-4 pr-12 pl-8 text-left text-xs opacity-60 transition-opacity hover:opacity-100"
                label={command}
                text={command}
              />
              <ClipboardIcon
                className="pointer-events-none absolute right-4"
                size={12}
              />
            </div>

            <TooltipProvider>
              <Tooltip delayDuration={1_000}>
                <TooltipContent>
                  <b>{stars}</b> stars on GitHub
                </TooltipContent>
                <TooltipTrigger>
                  <Link target="_blank" to={OPENTHROTTLE_GITHUB_URL}>
                    <Button
                      className="flex items-center gap-2 text-xs"
                      variant="brand"
                    >
                      <span>View on GitHub</span>
                      <GithubLogoIcon weight="fill" />
                    </Button>
                  </Link>
                </TooltipTrigger>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </>
  );
};
