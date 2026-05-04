import * as React from 'react';
import { Link } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { WORKSPACE_CORE_ENTITY_LINKS } from '~/routing/navigation/data/workspace-jump-links';

export interface WorkspaceEntityCrossLinksProps {
  readonly className?: string;
  /**
   * @description When set, describe the strip for assistive tech (e.g. context-specific region label).
   */
  readonly label?: string;
}

/**
 * @description Compact links between dashboard, search, plans, projects, and notes for faster entity jumps.
 */
export function WorkspaceEntityCrossLinks(
  props: WorkspaceEntityCrossLinksProps,
) {
  const { className, label } = props;

  return (
    <section
      aria-label={label ?? 'Workspace shortcuts'}
      className={className}
      data-testid="WorkspaceEntityCrossLinks"
    >
      <div className="flex flex-wrap items-center gap-2">
        {WORKSPACE_CORE_ENTITY_LINKS.map((item) => (
          <Button asChild={true} key={item.to} size="sm" variant="outline">
            <Link to={item.to} viewTransition={true}>
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
