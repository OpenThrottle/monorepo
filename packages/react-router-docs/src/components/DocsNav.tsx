import * as React from 'react';
import clsx from 'clsx';
import { NavLink } from 'react-router';
import type { DocsNavGroup } from '../utils/buildDocsNav';

export interface DocsNavProps {
  readonly className?: string;
  readonly groups: readonly DocsNavGroup[];
}

/**
 * Sidebar navigation for the docs section: grouped links derived from the
 * manifest via {@link buildDocsNav}. Uses react-router `NavLink` so the active
 * page is marked with `aria-current` and `data-active`.
 *
 * @public
 */
export const DocsNav = (props: DocsNavProps): React.ReactElement => {
  const { className, groups } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <nav
      aria-label="Documentation"
      className={clsx('flex flex-col gap-4', className)}
      data-testid="DocsNav"
    >
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
            {group.label}
          </p>

          <ul className="mt-4 flex flex-col gap-0.5">
            {group.items.map((item, _index) => (
              <li key={item.path}>
                <NavLink
                  className={({ isActive }) =>
                    clsx(
                      'block rounded-md px-2 py-1 text-sm',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground',
                    )
                  }
                  end={true}
                  to={item.path}
                >
                  {item.title}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};
