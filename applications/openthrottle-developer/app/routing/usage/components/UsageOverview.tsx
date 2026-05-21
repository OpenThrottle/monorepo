import * as React from 'react';
import classnames from 'classnames';
import { Badge } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';

interface UsageOverviewProps {
  readonly className?: string;
  readonly rangeDays: number;
}

export const UsageOverview = (props: UsageOverviewProps) => {
  const { className, rangeDays } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames(className)}>
      <GlobalHeading
        className="mb-4 text-xl"
        title="Agents &amp; OpenThrottle usage"
      />
      <div className="text-sm text-muted-foreground space-y-4 md:space-y-8">
        <p>
          Plan and task counts come from OpenThrottle daily stats (last{' '}
          {rangeDays} days). They approximate automation load from Ralph,
          workflows, and manual work in the portal—they do not include model
          token usage or per-prompt billing. For prompt-level debugging, use{' '}
          <Link className="underline" to="/prompts">
            Prompts
          </Link>{' '}
          and the versioning panel on a prompt detail page.
        </p>

        {/* <p>
          <span className="font-medium text-foreground">
            Not in this chart:{' '}
          </span>
          per-skill or per-prompt invocations, IDE-only runs, token or cost
          usage, and skill picks from user-local{' '}
          <code className="text-xs">~/.cursor/skills-cursor</code>.
        </p> */}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 md:mt-8">
        <Link className="text-primary underline" to="/prompts?type=AGENTS">
          <Badge>Agents-type prompts</Badge>
        </Link>
        <Link className="text-primary underline" to="/prompts?type=SKILLS">
          <Badge>Skills-type prompts</Badge>
        </Link>
        <Link className="text-primary underline" to="/skills">
          <Badge>Repo skill paths</Badge>
        </Link>
      </div>
    </div>
  );
};
