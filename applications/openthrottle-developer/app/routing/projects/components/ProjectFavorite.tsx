import { Button, cn } from '@openthrottle/react-router-shadcn';
import { StarIcon } from 'lucide-react';
import * as React from 'react';
import { useFetcher } from 'react-router';

import { PROJECT_FAVORITE_COPY } from '~/routing/projects/data/copy';

export interface ProjectFavoriteProps {
  readonly className?: string;
  /** Whether the current user has starred this project (server truth). */
  readonly favorite: boolean;
  /** The project this star controls. */
  readonly projectId: string;
  /** Project name, appended to the accessible label so rows stay distinguishable. */
  readonly projectName: string;
}

/**
 * @description Star toggle for a project. Posts intent `setProjectFavorite` to the
 * current route's action (the projects index and the project detail route both
 * handle it) and shows the submitted value while the request is in flight.
 */
export const ProjectFavorite = (
  props: ProjectFavoriteProps,
): React.ReactElement => {
  const { className, favorite, projectId, projectName } = props;

  // Hooks
  const fetcher = useFetcher();

  // Setup
  const submittedFavorite = fetcher.formData?.get('favorite');
  const isOptimistic = fetcher.state !== 'idle' && submittedFavorite != null;
  const optimisticFavorite = isOptimistic
    ? submittedFavorite === 'true'
    : favorite;
  const label = optimisticFavorite
    ? PROJECT_FAVORITE_COPY.unstarLabelPrefix
    : PROJECT_FAVORITE_COPY.starLabelPrefix;
  const favoredStarClass = 'fill-yellow-400 text-yellow-400';
  const idleStarClass = 'text-muted-foreground';

  // Handlers
  const handleClick = (): void => {
    fetcher.submit(
      {
        favorite: String(!optimisticFavorite),
        intent: 'setProjectFavorite',
        projectId,
      },
      { method: 'post' },
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Button
      aria-label={`${label} ${projectName}`}
      aria-pressed={optimisticFavorite}
      className={cn('size-6', className)}
      data-testid="ProjectFavorite"
      onClick={handleClick}
      size="icon"
      type="button"
      variant="ghost"
    >
      <StarIcon
        className={cn(
          'size-3.5',
          optimisticFavorite ? favoredStarClass : idleStarClass,
        )}
      />
    </Button>
  );
};
