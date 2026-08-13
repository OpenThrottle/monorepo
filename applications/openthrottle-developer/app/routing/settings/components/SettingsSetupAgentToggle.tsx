import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import {
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { SETTINGS_SETUP_COPY } from '~/routing/settings/data/data.copy';
import type { action as agentEnabledAction } from '~/routes/resources.agent-enabled';

/** Resource-route action path backing the per-agent enable/disable toggle. */
const AGENT_ENABLED_ACTION = '/resources/agent-enabled';

export interface SettingsSetupAgentToggleProps {
  /** Driver id this toggle controls. */
  backend: string;
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Per-user enablement from the loader (server truth). */
  enabled: boolean;
}

export const SettingsSetupAgentToggle = (
  props: SettingsSetupAgentToggleProps,
): React.ReactElement => {
  const { backend, canManage, enabled } = props;

  // Hooks
  const fetcher = useFetcher<typeof agentEnabledAction>();
  const revalidator = useRevalidator();

  // Setup
  // While a toggle is in flight, reflect the submitted value optimistically;
  // otherwise show the loader's server truth.
  const submittedEnabled = fetcher.formData?.get('enabled');
  const optimisticEnabled =
    fetcher.state !== 'idle' && submittedEnabled != null
      ? submittedEnabled === 'true'
      : enabled;
  const disabled = !canManage || fetcher.state !== 'idle';
  const errorMessage = fetcher.data?.errorMessage ?? null;

  // Handlers
  const handleCheckedChange = (next: boolean): void => {
    fetcher.submit(
      { backend, enabled: String(next) },
      { action: AGENT_ENABLED_ACTION, method: 'post' },
    );
  };

  // Markup

  // Life Cycle
  const revalidatedRef = React.useRef(false);
  React.useEffect(() => {
    // Once the mutation settles cleanly, refetch the loader so every surface
    // (this row + the composer pickers) re-reflects the persisted state. Guard
    // so it fires once per settled submission.
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
      aria-label={SETTINGS_SETUP_COPY.enabledToggleLabel}
      checked={optimisticEnabled}
      data-testid={`SettingsSetupAgentToggle-${backend}`}
      disabled={disabled}
      onCheckedChange={handleCheckedChange}
    />
  );

  return (
    <div className="flex flex-col items-start gap-1">
      {canManage ? (
        control
      ) : (
        <Tooltip>
          <TooltipTrigger asChild={true}>
            {/* A disabled Switch swallows pointer events, so wrap it to keep the tooltip reachable. */}
            <span className="inline-flex">{control}</span>
          </TooltipTrigger>
          <TooltipContent>
            {SETTINGS_SETUP_COPY.toggleDisabledReason}
          </TooltipContent>
        </Tooltip>
      )}
      {errorMessage != null ? (
        <p className="text-destructive text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
};
