import { Button } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher, useRevalidator } from 'react-router';

import type { action as agentModelsEnabledAction } from '~/routes/resources.agent-models-enabled';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/copy';
import {
  settingsAgentsModelBulkDeselectShown,
  settingsAgentsModelBulkSelectShown,
} from '~/routing/settings/utils/settings-agents-copy';

/** Resource-route action path backing the per-agent select-all / deselect-all controls. */
const AGENT_MODELS_ENABLED_ACTION = '/resources/agent-models-enabled';

export interface SettingsAgentsModelBulkToggleProps {
  /** True when the parent agent is disabled (agent-OFF hard-overrides every model). */
  agentDisabled: boolean;
  /** Server-computed: current user holds SETTINGS_WRITE. */
  canManage: boolean;
  /** Driver id these models belong to. */
  driver: string;
  /** Count of currently-enabled models among `models` (drives which control is actionable). */
  enabledCount: number;
  /** True while a model filter narrows `models`; the labels then name the shown count. */
  filtered: boolean;
  /** The model ids the controls act on: every model, or only the filtered ones. */
  models: readonly string[];
}

export const SettingsAgentsModelBulkToggle = (
  props: SettingsAgentsModelBulkToggleProps,
): React.ReactElement => {
  const { agentDisabled, driver, canManage, enabledCount, filtered, models } =
    props;

  // Hooks
  const fetcher = useFetcher<typeof agentModelsEnabledAction>();
  const revalidator = useRevalidator();

  // Setup
  const total = models.length;
  const inFlight = fetcher.state !== 'idle';
  const locked = !canManage || agentDisabled || inFlight;
  const allEnabled = enabledCount >= total;
  const allDisabled = enabledCount === 0;
  const errorMessage = fetcher.data?.errorMessage ?? null;
  const selectLabel = filtered
    ? settingsAgentsModelBulkSelectShown(total)
    : SETTINGS_AGENTS_COPY.modelBulkSelect;
  const deselectLabel = filtered
    ? settingsAgentsModelBulkDeselectShown(total)
    : SETTINGS_AGENTS_COPY.modelBulkDeselect;

  // Handlers
  const submit = (enabled: boolean): void => {
    fetcher.submit(
      { driver, enabled: String(enabled), models: JSON.stringify(models) },
      { action: AGENT_MODELS_ENABLED_ACTION, method: 'post' },
    );
  };
  const handleEnableAll = (): void => {
    return submit(true);
  };
  const handleDisableAll = (): void => {
    return submit(false);
  };

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
          data-testid={`SettingsAgentsModelBulkToggle-${driver}-enable`}
          disabled={locked || allEnabled}
          onClick={handleEnableAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          {selectLabel}
        </Button>
        <Button
          className="h-6 px-2 text-xs"
          data-testid={`SettingsAgentsModelBulkToggle-${driver}-disable`}
          disabled={locked || allDisabled}
          onClick={handleDisableAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          {deselectLabel}
        </Button>
      </div>
      {errorMessage != null ? (
        <p className="text-destructive text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
};
