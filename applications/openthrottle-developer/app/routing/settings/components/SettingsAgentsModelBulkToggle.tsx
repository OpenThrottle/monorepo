import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';
import type { AgentModelsEnabledActionResult } from '~/routing/settings/data/agent-action-results';

/** Resource-route action path backing the per-agent select-all / deselect-all controls. */
const AGENT_MODELS_ENABLED_ACTION = '/resources/agent-models-enabled';

export interface SettingsAgentsModelBulkToggleProps {
  /** True when the parent agent is disabled (agent-OFF hard-overrides every model). */
  agentDisabled: boolean;
  /** Driver id these models belong to. */
  backend: string;
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Count of currently-enabled models (drives which control is actionable). */
  enabledCount: number;
  /** Every model id of this agent, in discovery order. */
  models: readonly string[];
}

export const SettingsAgentsModelBulkToggle = (
  props: SettingsAgentsModelBulkToggleProps,
): React.ReactElement => {
  const { agentDisabled, backend, canManage, enabledCount, models } = props;

  // Hooks
  const fetcher = useFetcher<AgentModelsEnabledActionResult>();
  const revalidator = useRevalidator();

  // Setup
  const total = models.length;
  const inFlight = fetcher.state !== 'idle';
  const locked = !canManage || agentDisabled || inFlight;
  const allEnabled = enabledCount >= total;
  const allDisabled = enabledCount === 0;
  const errorMessage = fetcher.data?.errorMessage ?? null;

  // Handlers
  const submit = (enabled: boolean): void => {
    fetcher.submit(
      { backend, enabled: String(enabled), models: JSON.stringify(models) },
      { action: AGENT_MODELS_ENABLED_ACTION, method: 'post' },
    );
  };
  const handleEnableAll = (): void => submit(true);
  const handleDisableAll = (): void => submit(false);

  // Markup

  // Life Cycle
  const revalidatedRef = React.useRef(false);
  React.useEffect(() => {
    // Once the bulk mutation settles cleanly, refetch the loader so the row +
    // every model control re-reflect the persisted state.
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

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button
          className="h-6 px-2 text-xs"
          data-testid={`SettingsAgentsModelBulkToggle-${backend}-enable`}
          disabled={locked || allEnabled}
          onClick={handleEnableAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          {SETTINGS_AGENTS_COPY.modelBulkSelect}
        </Button>
        <Button
          className="h-6 px-2 text-xs"
          data-testid={`SettingsAgentsModelBulkToggle-${backend}-disable`}
          disabled={locked || allDisabled}
          onClick={handleDisableAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          {SETTINGS_AGENTS_COPY.modelBulkDeselect}
        </Button>
      </div>
      {errorMessage != null ? (
        <p className="text-destructive text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
};
