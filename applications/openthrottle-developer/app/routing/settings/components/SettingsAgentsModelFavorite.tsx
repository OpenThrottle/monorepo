import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { StarIcon } from 'lucide-react';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from '@openthrottle/react-router-shadcn';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';
import type { action as agentModelFavoriteAction } from '~/routes/resources.agent-model-favorite';

/** Resource-route action path backing the per-model favorite toggle. */
const AGENT_MODEL_FAVORITE_ACTION = '/resources/agent-model-favorite';

export interface SettingsAgentsModelFavoriteProps {
  /** Driver id this model belongs to. */
  backend: string;
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Whether this model is currently favorited (server truth). */
  favorite: boolean;
  /** The model id this star controls. */
  model: string;
}

export const SettingsAgentsModelFavorite = (
  props: SettingsAgentsModelFavoriteProps,
): React.ReactElement => {
  const { backend, canManage, favorite, model } = props;

  // Hooks
  const fetcher = useFetcher<typeof agentModelFavoriteAction>();
  const revalidator = useRevalidator();

  // Setup
  const submittedFavorite = fetcher.formData?.get('favorite');
  const optimisticFavorite =
    fetcher.state !== 'idle' && submittedFavorite != null
      ? submittedFavorite === 'true'
      : favorite;
  const disabled = !canManage || fetcher.state !== 'idle';

  // Handlers
  const handleClick = (): void => {
    fetcher.submit(
      { backend, favorite: String(!optimisticFavorite), model },
      { action: AGENT_MODEL_FAVORITE_ACTION, method: 'post' },
    );
  };

  // Markup

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

  const control = (
    <Button
      aria-label={SETTINGS_AGENTS_COPY.modelFavoriteLabel}
      aria-pressed={optimisticFavorite}
      className="size-6"
      data-testid={`SettingsAgentsModelFavorite-${backend}-${model}`}
      disabled={disabled}
      onClick={handleClick}
      size="icon"
      type="button"
      variant="ghost"
    >
      <StarIcon
        className={cn(
          'size-3.5',
          optimisticFavorite
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-muted-foreground',
        )}
      />
    </Button>
  );

  return canManage ? (
    control
  ) : (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <span className="inline-flex">{control}</span>
      </TooltipTrigger>
      <TooltipContent>
        {SETTINGS_AGENTS_COPY.toggleDisabledReason}
      </TooltipContent>
    </Tooltip>
  );
};
