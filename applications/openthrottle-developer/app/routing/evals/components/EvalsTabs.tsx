import {
  cn,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import type { EvalsTabValue } from '~/routing/evals/config/defaults';
import { EVALS_TAB } from '~/routing/evals/config/defaults';
import { EVALS_TABS_COPY } from '~/routing/evals/data/copy';

export interface EvalsTabsProps {
  /** The page being shown. */
  readonly active: EvalsTabValue;
  readonly className?: string;
}

/**
 * @description The evals area's tab bar. Each tab is its own URL, so the
 * triggers are links: Runs stays at /evals, Trajectories is /evals/trajectories.
 */
export const EvalsTabs = (props: EvalsTabsProps): React.ReactElement => {
  const { active, className } = props;

  // Hooks

  // Setup
  const copy = EVALS_TABS_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tabs className={cn(className)} data-testid="EvalsTabs" value={active}>
      <TabsList aria-label={copy.label} variant="line">
        <TabsTrigger asChild={true} value={EVALS_TAB.runs}>
          <Link to="/evals">{copy.runs}</Link>
        </TabsTrigger>
        <TabsTrigger asChild={true} value={EVALS_TAB.trajectories}>
          <Link to="/evals/trajectories">{copy.trajectories}</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
