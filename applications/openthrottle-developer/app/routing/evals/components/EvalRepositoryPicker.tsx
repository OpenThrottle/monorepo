import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

export interface EvalRepositoryPickerRepository {
  readonly displayName: string;
  readonly id: string;
}

export interface EvalRepositoryPickerProps {
  /** Text of a leading "every repository" choice; null for no such choice. */
  readonly allLabel: string | null;
  /** The URL that selects a repository (null: every repository). */
  readonly buildHref: (repositoryId: string | null) => string;
  readonly className?: string;
  readonly label: string;
  readonly repositories: readonly EvalRepositoryPickerRepository[];
  readonly selectedRepositoryId: string | null;
}

/**
 * @description The evals area's repository picker: one link per repository,
 * the selected one marked as the current page. The Runs page needs a
 * repository; the Trajectories page also offers every repository at once.
 */
export const EvalRepositoryPicker = (
  props: EvalRepositoryPickerProps,
): React.ReactElement => {
  const {
    allLabel,
    buildHref,
    className,
    label,
    repositories,
    selectedRepositoryId,
  } = props;

  // Hooks

  // Setup
  const allChoice =
    allLabel === null ? [] : [{ displayName: allLabel, id: null }];
  const choices = [...allChoice, ...repositories];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <nav
      aria-label={label}
      className={cn(className)}
      data-testid="EvalRepositoryPicker"
    >
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {choices.map((choice) => {
          const isCurrent = choice.id === selectedRepositoryId;

          return (
            <li key={choice.id ?? 'all'}>
              <Link
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'underline-offset-4 hover:underline',
                  isCurrent && 'font-medium underline',
                )}
                to={buildHref(choice.id)}
              >
                {choice.displayName}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
