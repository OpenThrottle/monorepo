import * as React from 'react';
import clsx from 'clsx';
import { Badge } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';

export interface UsageOverviewProps {
  className?: string;
  rangeDays: number;
}

export const UsageOverview = (
  props: UsageOverviewProps,
): React.ReactElement => {
  const { className, rangeDays } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx(className)}>
      <GlobalHeading className="mb-4" title="Agents &amp; OpenThrottle usage" />
      <div className="text-muted-foreground space-y-4 text-sm md:space-y-8">
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

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 md:mt-8">
        <Badge color="yellow" size="xs">
          <Link to="/prompts?type=AGENTS">Agents-type prompts</Link>
        </Badge>
        {' · '}
        <Badge color="orange" size="xs">
          <Link to="/prompts?type=SKILLS">Skills-type prompts</Link>
        </Badge>
        {' · '}
        <Badge color="red" size="xs">
          <Link to="/skills">Repo skill paths</Link>
        </Badge>
      </div>
    </div>
  );
};
