import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import {
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { SETTINGS_SETUP_COPY } from '~/routing/settings/data/data.copy';
import type { action as agentModelEnabledAction } from '~/routes/resources.agent-model-enabled';

/** Resource-route action path backing the per-model enable/disable toggle. */
const AGENT_MODEL_ENABLED_ACTION = '/resources/agent-model-enabled';

export interface SettingsSetupModelToggleProps {
  /**
   * True when the parent agent is disabled: an agent-OFF hard-overrides every
   * model, so the control is inert (and a tooltip explains why).
   */
  agentDisabled: boolean;
  /** Driver id this model belongs to. */
  backend: string;
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Effective per-model enablement from the loader (server truth). */
  enabled: boolean;
  /** The model id this toggle controls. */
  model: string;
}

export const SettingsSetupModelToggle = (
  props: SettingsSetupModelToggleProps,
): React.ReactElement => {
  const { agentDisabled, backend, canManage, enabled, model } = props;

  // Hooks
  const fetcher = useFetcher<typeof agentModelEnabledAction>();
  const revalidator = useRevalidator();

  // Setup
  // While a toggle is in flight, reflect the submitted value optimistically;
  // otherwise show the loader's server truth.
  const submittedEnabled = fetcher.formData?.get('enabled');
  const optimisticEnabled =
    fetcher.state !== 'idle' && submittedEnabled != null
      ? submittedEnabled === 'true'
      : enabled;
  const disabled = !canManage || agentDisabled || fetcher.state !== 'idle';
  const errorMessage = fetcher.data?.errorMessage ?? null;

  // Handlers
  const handleCheckedChange = (next: boolean): void => {
    fetcher.submit(
      { backend, enabled: String(next), model },
      { action: AGENT_MODEL_ENABLED_ACTION, method: 'post' },
    );
  };

  // Markup

  // Life Cycle
  const revalidatedRef = React.useRef(false);
  React.useEffect(() => {
    // Once the mutation settles cleanly, refetch the loader so every surface
    // (this row + the composer pickers) re-reflects the persisted state.
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
    <Switch
      aria-label={SETTINGS_SETUP_COPY.modelToggleLabel}
      checked={optimisticEnabled}
      data-testid={`SettingsSetupModelToggle-${backend}-${model}`}
      disabled={disabled}
      onCheckedChange={handleCheckedChange}
      size="sm"
    />
  );

  const reason = agentDisabled
    ? SETTINGS_SETUP_COPY.modelsAgentOffReason
    : SETTINGS_SETUP_COPY.toggleDisabledReason;

  return (
    <div className="flex flex-col items-start gap-1">
      {canManage && !agentDisabled ? (
        control
      ) : (
        <Tooltip>
          <TooltipTrigger asChild={true}>
            {/* A disabled Switch swallows pointer events, so wrap it to keep the tooltip reachable. */}
            <span className="inline-flex">{control}</span>
          </TooltipTrigger>
          <TooltipContent>{reason}</TooltipContent>
        </Tooltip>
      )}
      {errorMessage != null ? (
        <p className="text-destructive text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
};
