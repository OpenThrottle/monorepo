import * as React from 'react';
import { Link } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  WORKSPACE_CORE_ENTITY_LINKS,
  WORKSPACE_FULL_JUMP_LINKS,
} from '~/routing/navigation/data/workspace-jump-links';

export interface WorkspaceEntityCrossLinksProps {
  className?: string;
  /**
   * @description When set, describe the strip for assistive tech (e.g. context-specific region label).
   */
  label?: string;
  /**
   * @description `core` lists dashboard/search/plans/projects/notes. `full` matches dashboard quick nav (queues, PRs, generators, etc.).
   */
  variant?: 'core' | 'full';
}

/**
 * @description Compact links between workspace areas for faster entity jumps.
 */
export const WorkspaceEntityCrossLinks = (
  props: WorkspaceEntityCrossLinksProps,
) => {
  const { className, label, variant = 'core' } = props;

  // Hooks

  // Setup

  const items =
    variant === 'full'
      ? WORKSPACE_FULL_JUMP_LINKS
      : WORKSPACE_CORE_ENTITY_LINKS;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-label={label ?? 'Workspace shortcuts'}
      className={className}
      data-testid="WorkspaceEntityCrossLinks"
    >
      <div className="flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <Button asChild={true} key={item.to} size="sm" variant="outline">
            <Link to={item.to} viewTransition={true}>
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
};
