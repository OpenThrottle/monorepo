import * as React from 'react';
import classnames from 'classnames';
import { OpenThrottleClipboard } from './OpenThrottleClipboard';
import { ClipboardIcon, DollarSignIcon } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Separator,
} from '@openthrottle/react-router-shadcn';
import { getRandomIntroduction } from '../data/data.introductions';
import { Link } from 'react-router';
import { OPEN_THROTTLE_GITHUB_URL } from '@openthrottle/react-router-utils';
import { OpenThrottleLogo } from './OpenThrottleLogo';

export interface OpenThrottleProductGetStartedProps {
  className?: string;
  introduction?: string;
}

export const OpenThrottleProductGetStarted = (
  props: OpenThrottleProductGetStartedProps,
): React.ReactElement => {
  const { className, introduction: introductionProp } = props;

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
    <Card className={classnames('max-w-2xl mx-auto', className)}>
      <CardHeader className="flex w-auto items-center gap-2 justify-start">
        <OpenThrottleLogo className="text-xl" />
        <span className="text-muted-foreground/50 font-extralight">
          |&nbsp;
        </span>
        <span className="text-lg font-extralight text-highlight">AI</span>
      </CardHeader>

      <hr />

      <CardContent>
        <p className="text-sm text-muted-foreground my-4">{introduction}</p>
      </CardContent>

      <Separator />

      <CardFooter>
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
      </CardFooter>
    </Card>
  );
};
