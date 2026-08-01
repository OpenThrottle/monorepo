import * as React from 'react';
import { Link } from 'react-router';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';

export interface UsageAnalyticsGapsProps {}

export const UsageAnalyticsGaps = (
  _props: UsageAnalyticsGapsProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="mt-8">
      <div className="mb-4">
        <GlobalHeading
          className="mb-4"
          heading="h2"
          title="Analytics gaps (by design today)"
        />
        <p className="text-muted-foreground text-sm">
          Use other surfaces when you need finer-grained debugging—the Usage
          chart is a coarse workload signal only.
        </p>
      </div>

      <div className="text-muted-foreground mt-4 text-xs md:mt-8">
        <ul className="list-disc space-y-1 pl-5">
          <li>No per-prompt, per-skill, or per-command invocation counts.</li>
          <li>
            No latency metrics. Token and cost usage is captured — see{' '}
            <span className="text-foreground">Model token usage</span> above.
          </li>
          <li>
            No visibility into user-local skills under{' '}
            <code className="text-xs">~/.cursor/skills-cursor</code> (not
            in-repo).
          </li>
          <li>
            For prompt identity and version drift, open a prompt and expand{' '}
            <span className="text-foreground">
              Prompt versioning &amp; debug
            </span>{' '}
            (relative timestamps and content fingerprints), or jump from{' '}
            <Link className="text-primary underline" to="/prompts">
              Prompts
            </Link>
            .
          </li>
          <li>
            Use{' '}
            <span className="text-foreground">Copy usage snapshot (JSON)</span>{' '}
            above to attach the same daily rows and totals to a ticket—still no
            per-prompt metrics, but easier than screenshots.
          </li>
          <li>
            For in-repo skill paths, see{' '}
            <Link className="text-primary underline" to="/skills">
              Skills
            </Link>{' '}
            (<code className="text-xs">.agents/skills</code> vs{' '}
            <code className="text-xs">.cursor/skills</code>).
          </li>
        </ul>
      </div>
    </div>
  );
};
