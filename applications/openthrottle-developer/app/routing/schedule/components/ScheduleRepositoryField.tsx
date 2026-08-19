import * as React from 'react';
import { Link } from 'react-router';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import {
  SCHEDULE_REPOSITORY_NONE_VALUE,
  type ScheduleRepositoryOption,
} from '~/routing/schedule/data/data.repositories';

export interface ScheduleRepositoryFieldProps {
  /** Legacy explicit working directory currently on the schedule, if any. */
  cwd?: string | null;
  /** The caller's registered checkouts; empty renders the settings-link empty state. */
  repositories: ScheduleRepositoryOption[];
  /** Checkout the schedule currently targets, if any. */
  repositoryCheckoutId?: string | null;
}

/**
 * @description Repository target for a schedule: a picker over the user's registered checkouts, with
 * the deprecated free-text working directory kept behind a disclosure so legacy schedules stay
 * editable. The server resolves the checkout to a cwd, so nothing here types a path.
 */
export const ScheduleRepositoryField = (
  props: ScheduleRepositoryFieldProps,
): React.ReactElement => {
  const { cwd, repositories, repositoryCheckoutId } = props;

  // Hooks

  // Setup
  const hasRepositories = repositories.length > 0;
  // A legacy schedule that only ever had a typed path should show the advanced field opened, or its
  // value would be invisible until the user thought to look for it.
  const advancedOpen = (cwd ?? '') !== '';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-3" data-testid="ScheduleRepositoryField">
      <div>
        <Label htmlFor="repositoryCheckoutId">
          {SCHEDULE_COPY.repositoryLabel}
        </Label>

        {hasRepositories ? (
          <Select
            defaultValue={
              repositoryCheckoutId ?? SCHEDULE_REPOSITORY_NONE_VALUE
            }
            name="repositoryCheckoutId"
          >
            <SelectTrigger
              aria-label={SCHEDULE_COPY.repositoryLabel}
              id="repositoryCheckoutId"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SCHEDULE_REPOSITORY_NONE_VALUE}>
                {SCHEDULE_COPY.repositoryNoneOption}
              </SelectItem>
              {repositories.map((repository) => (
                <SelectItem key={repository.id} value={repository.id}>
                  <span className="flex flex-col">
                    <span>{repository.displayName}</span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {repository.filesystemPath}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-muted-foreground text-sm">
            {SCHEDULE_COPY.repositoryEmptyState}{' '}
            <Link className="underline" to="/settings/repositories">
              {SCHEDULE_COPY.repositoryEmptyStateAction}
            </Link>
          </p>
        )}

        <p className="text-muted-foreground mt-1 text-xs">
          {SCHEDULE_COPY.repositoryHelp}
        </p>
      </div>

      <details open={advancedOpen}>
        <summary className="text-muted-foreground cursor-pointer text-xs">
          {SCHEDULE_COPY.repositoryAdvancedSummary}
        </summary>
        <div className="mt-2">
          <Label htmlFor="cwd">{SCHEDULE_COPY.cwdLabel}</Label>
          <Input
            defaultValue={cwd ?? ''}
            id="cwd"
            name="cwd"
            placeholder={SCHEDULE_COPY.cwdPlaceholder}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            {SCHEDULE_COPY.cwdHelp}
          </p>
        </div>
      </details>
    </div>
  );
};
