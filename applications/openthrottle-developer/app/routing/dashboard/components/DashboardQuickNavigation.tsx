import * as React from 'react';
import { Link } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { WORKSPACE_FULL_JUMP_LINKS } from '~/routing/navigation/data/workspace-jump-links';

export interface DashboardQuickNavigationProps {
  className?: string;
}

/**
 * @deprecated Temporarily commented out on dashboard index; restore when re-enabling quick navigation block.
 * @description Compact cross-entity links from the dashboard for faster navigation and debugging paths.
 */
export const DashboardQuickNavigation = (
  props: DashboardQuickNavigationProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section className={className} data-testid="DashboardQuickNavigation">
      <h3 className="mb-2">Jump to</h3>
      <p className="text-muted-foreground mb-3 text-sm">
        Quick paths across plans, search, queues, and tooling—same destinations
        as the command palette navigation items.
      </p>
      <div className="flex flex-wrap gap-2">
        {WORKSPACE_FULL_JUMP_LINKS.map((item) => (
          <Button asChild={true} key={item.to} size="sm" variant="outline">
            <Link to={item.to}>{item.label}</Link>
          </Button>
        ))}
      </div>
    </section>
  );
};
