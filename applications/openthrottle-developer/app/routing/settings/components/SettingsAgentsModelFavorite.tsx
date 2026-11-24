import {
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { StarIcon } from 'lucide-react';
import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';

import type { action as agentModelFavoriteAction } from '~/routes/resources.agent-model-favorite';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';

/** Resource-route action path backing the per-model favorite toggle. */
const AGENT_MODEL_FAVORITE_ACTION = '/resources/agent-model-favorite';

export interface SettingsAgentsModelFavoriteProps {
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Driver id this model belongs to. */
  driver: string;
  /** Whether this model is currently favorited (server truth). */
  favorite: boolean;
  /** The model id this star controls. */
  model: string;
}

export const SettingsAgentsModelFavorite = (
  props: SettingsAgentsModelFavoriteProps,
): React.ReactElement => {
  const { driver, canManage, favorite, model } = props;

  // Hooks
  const fetcher = useFetcher<typeof agentModelFavoriteAction>();
  const revalidator = useRevalidator();

  // Setup
  const submittedFavorite = fetcher.formData?.get('favorite');
  const isOptimistic = fetcher.state !== 'idle' && submittedFavorite != null;
  const submittedValue = submittedFavorite === 'true';
  const optimisticFavorite = isOptimistic ? submittedValue : favorite;
  const disabled = !canManage || fetcher.state !== 'idle';
  const favoredStarClass = 'fill-yellow-400 text-yellow-400';
  const idleStarClass = 'text-muted-foreground';

  // Handlers
  const handleClick = (): void => {
    fetcher.submit(
      { driver, favorite: String(!optimisticFavorite), model },
      { action: AGENT_MODEL_FAVORITE_ACTION, method: 'post' },
    );
  };

  // Markup
  const control = (
    <Button
      aria-label={SETTINGS_AGENTS_COPY.modelFavoriteLabel}
      aria-pressed={optimisticFavorite}
      className="size-6"
      data-testid={`SettingsAgentsModelFavorite-${driver}-${model}`}
      disabled={disabled}
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
  const lockedControl = (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <span className="inline-flex">{control}</span>
      </TooltipTrigger>
      <TooltipContent>
        {SETTINGS_AGENTS_COPY.toggleDisabledReason}
      </TooltipContent>
    </Tooltip>
  );

  // Life Cycle
  const revalidatedRef = React.useRef(false);
  React.useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data != null) {
      if (!revalidatedRef.current && fetcher.data.errorMessage == null) {
        revalidatedRef.current = true;
        revalidator.revalidate();
      }
    } else {
      revalidatedRef.current = false;
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  // 🔌 Short Circuit

  return canManage ? control : lockedControl;
};
