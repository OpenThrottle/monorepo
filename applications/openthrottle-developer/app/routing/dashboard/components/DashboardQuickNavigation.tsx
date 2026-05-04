import * as React from 'react';
import { Link } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';

const LINKS: readonly { readonly label: string; readonly to: string }[] = [
  { label: 'Search', to: '/search' },
  { label: 'Plans', to: '/plans' },
  { label: 'Projects', to: '/projects' },
  { label: 'Prompts', to: '/prompts' },
  { label: 'Pull requests', to: '/pull-requests' },
  { label: 'Notes', to: '/notes' },
  { label: 'Queues', to: '/queues' },
  { label: 'Skills', to: '/skills' },
  { label: 'Generators', to: '/generators' },
  { label: 'Settings', to: '/settings' },
];

export interface DashboardQuickNavigationProps {
  readonly className?: string;
}

/**
 * @description Compact cross-entity links from the dashboard for faster navigation and debugging paths.
 */
export function DashboardQuickNavigation(props: DashboardQuickNavigationProps) {
  const { className } = props;

  return (
    <section className={className} data-testid="DashboardQuickNavigation">
      <h3 className="text-lg font-bold mb-2">Jump to</h3>
      <p className="text-muted-foreground text-sm mb-3">
        Quick paths across plans, search, queues, and tooling—same destinations
        as the command palette navigation items.
      </p>
      <div className="flex flex-wrap gap-2">
        {LINKS.map((item) => (
          <Button asChild={true} key={item.to} size="sm" variant="outline">
            <Link to={item.to}>{item.label}</Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
